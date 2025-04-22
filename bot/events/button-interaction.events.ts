import {
  ButtonInteraction,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  EmbedBuilder,
} from 'discord.js';
import { logger } from '../utils/logger.utils';
import { createErrorEmbed, createSuccessEmbed, StatusIcons } from '../helpers/message.helpers';
import CastDemand from '../database/models/cast-demand.model';

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  try {
    if (!interaction.guild) {
      throw new Error('This command can only be used in a server');
    }

    // Check if this is a cast accept button
    if (interaction.customId.startsWith('accept_cast_')) {
      const castDemandId = interaction.customId.split('_')[2];

      // Get the cast demand from database
      const castDemand = await CastDemand.findById(castDemandId);
      if (!castDemand) {
        throw new Error('Cast demand not found');
      }

      // Check if cast demand is already accepted
      if (castDemand.status === 'ACCEPTED') {
        await interaction.reply({
          embeds: [createErrorEmbed('Error', 'This cast demand has already been accepted')],
          flags: ['Ephemeral'],
        });
        return;
      }

      // Parse and validate date
      let eventDate: Date;
      try {
        // Parse date in dd/MM format
        const [day, month] = castDemand.date.split('/').map(Number);
        const [hours, minutes] = castDemand.time.split(':').map(Number);

        if (isNaN(day) || isNaN(month) || isNaN(hours) || isNaN(minutes)) {
          throw new Error('Invalid date or time format');
        }

        // Create date object with current year
        const currentYear = new Date().getFullYear();
        eventDate = new Date(currentYear, month - 1, day, hours, minutes);

        // If the date is in the past, use next year
        if (eventDate < new Date()) {
          eventDate = new Date(currentYear + 1, month - 1, day, hours, minutes);
        }

        if (isNaN(eventDate.getTime())) {
          throw new Error('Invalid date or time values');
        }
      } catch (error) {
        logger.error('Error parsing date:', error);
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'Error',
              'Invalid date or time format in the cast demand. Please contact an administrator.',
            ),
          ],
          flags: ['Ephemeral'],
        });
        return;
      }

      // Validate event date is not in the past
      if (eventDate < new Date()) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'Error',
              'Cannot accept a cast for a past event. Please create a new cast demand.',
            ),
          ],
          flags: ['Ephemeral'],
        });
        return;
      }

      // Get team name from role
      const teamRoleId = castDemand.teamDiscordRole.match(/<@&(\d+)>/)?.[1];
      const teamRole = teamRoleId ? await interaction.guild.roles.fetch(teamRoleId) : null;
      const teamName = teamRole?.name || castDemand.teamDiscordRole;

      // Create Discord event
      const event = await interaction.guild.scheduledEvents.create({
        name: `[${castDemand.eventType}] ${teamName} VS ${castDemand.opponentTeam}`,
        description: `Caster: <@${interaction.user.id}>\n\nMatch Details:\n- Event Type: ${castDemand.eventType}\n- Teams: ${castDemand.teamDiscordRole} vs ${castDemand.opponentTeam}\n- Game Mode: ${castDemand.gameMode}\n- Format: ${castDemand.matchFormat}\n- Opponent OP.GG: ${castDemand.opponentOpgg}`,
        scheduledStartTime: eventDate,
        scheduledEndTime: new Date(eventDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType: GuildScheduledEventEntityType.External,
        entityMetadata: {
          location: 'https://www.twitch.tv/twinspire_tv/',
        },
      });

      // Update cast demand status
      castDemand.status = 'ACCEPTED';
      castDemand.acceptedBy = interaction.user.id;
      castDemand.eventId = event.id;
      await castDemand.save();

      // Update the original message
      const channel = await interaction.guild.channels.fetch(castDemand.channelId);
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(castDemand.messageId);
        if (message) {
          const embed = message.embeds[0];
          if (embed) {
            const newEmbed = EmbedBuilder.from(embed)
              .setColor('#00ff00') // Green color for accepted
              .addFields({
                name: `${StatusIcons.SUCCESS} Status`,
                value: `Accepted by <@${interaction.user.id}>`,
                inline: true,
              });
            await message.edit({ embeds: [newEmbed], components: [] });
          }
        }
      }

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Cast Accepted',
            `You have accepted to cast this match!\n\nA Discord event has been created: ${event.url}`,
          ),
        ],
        flags: ['Ephemeral'],
      });
    }
  } catch (error: any) {
    logger.error('Error handling button interaction:', error);

    let errorMessage = 'Failed to process your request';
    if (error.message.includes('GUILD_SCHEDULED_EVENT_SCHEDULE_PAST')) {
      errorMessage = 'Cannot schedule event in the past. Please create a new cast demand.';
    } else if (error.message.includes('This command can only be used in a server')) {
      errorMessage = 'This command can only be used in a server channel.';
    } else if (error.message.includes('Cast demand not found')) {
      errorMessage = 'The cast demand could not be found. It may have been deleted.';
    } else if (error.message.includes('Invalid time value')) {
      errorMessage =
        'Invalid date or time format in the cast demand. Please contact an administrator.';
    }

    await interaction.reply({
      embeds: [createErrorEmbed('Error', errorMessage)],
      flags: ['Ephemeral'],
    });
  }
}
