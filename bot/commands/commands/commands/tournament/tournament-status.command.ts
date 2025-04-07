import { ChatInputCommandInteraction, TextChannel, ChannelType } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TournamentService } from '../../../../services/tournament/tournament.services';
import { TournamentStatus } from '../../../../database/enums/tournament-status.enums';
import {
  StatusIcons,
  createSuccessEmbed,
  createErrorEmbed,
  createTournamentEmbed,
  formatTimestamp,
} from '../../../../helpers/message.helpers';

const tournamentService = new TournamentService();

export async function handleUpdateStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const tournamentId = interaction.options.getString('tournament_id', true);
    const newStatus = interaction.options.getString('status', true) as TournamentStatus;

    const tournament = await tournamentService.getTournamentById(tournamentId);
    if (!tournament) {
      const errorEmbed = createErrorEmbed(
        'Tournament Not Found',
        `Could not find a tournament with ID: \`${tournamentId}\``,
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    // Get appropriate status icon
    const statusIcon =
      newStatus === TournamentStatus.ACTIVE
        ? StatusIcons.UNLOCKED
        : newStatus === TournamentStatus.UPCOMING
          ? StatusIcons.TIME
          : StatusIcons.TROPHY; // for COMPLETED

    // Update the tournament status
    const success = await tournamentService.updateTournament(tournamentId, { status: newStatus });

    if (success) {
      // Create success embed for admin
      const adminEmbed = createSuccessEmbed(
        'Tournament Status Updated',
        `Successfully updated **${tournament.name}** status to **${newStatus}**`,
      );

      adminEmbed.addFields(
        { name: 'Tournament ID', value: `\`${tournamentId}\``, inline: true },
        { name: 'Previous Status', value: tournament.status, inline: true },
        { name: 'New Status', value: newStatus, inline: true },
      );

      await interaction.editReply({ embeds: [adminEmbed] });

      // Send public notification to tournament channel
      const tournamentChannel = interaction.guild?.channels.cache.find(
        channel => channel.name === 'tournament' && channel.type === ChannelType.GuildText
      ) as TextChannel | undefined;

      if (tournamentChannel) {
        // Create public announcement embed
        const publicEmbed = createTournamentEmbed(
          tournament.name,
          `${statusIcon} This tournament is now **${newStatus}**!`,
        );

        // Add relevant fields based on new status
        if (newStatus === TournamentStatus.ACTIVE) {
          publicEmbed.addFields(
            {
              name: `${StatusIcons.CALENDAR} Tournament Period`,
              value: `${formatTimestamp(tournament.startDate, 'D')} to ${formatTimestamp(tournament.endDate, 'D')}`,
              inline: false,
            },
            {
              name: `${StatusIcons.INFO} What This Means`,
              value: 'Teams can now challenge each other and start competing!',
              inline: false,
            },
          );
        } else if (newStatus === TournamentStatus.UPCOMING) {
          publicEmbed.addFields({
            name: `${StatusIcons.TIME} Tournament Status`,
            value: 'This tournament is now upcoming!',
            inline: false,
          });
        } else if (newStatus === TournamentStatus.COMPLETED) {
          publicEmbed.addFields({
            name: `${StatusIcons.TROPHY} Tournament Completed`,
            value: 'The tournament has concluded! Final standings will be announced soon.',
            inline: false,
          });
        }

        await tournamentChannel.send({ embeds: [publicEmbed] });
        logger.info(
          `Tournament status public announcement sent to tournament channel for ${tournament.name} (${tournamentId})`,
        );
      } else {
        logger.warn('Tournament channel not found for sending status update');
      }
    } else {
      const errorEmbed = createErrorEmbed(
        'Update Failed',
        `Failed to update tournament status for **${tournament.name}**.`,
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  } catch (error) {
    logger.error('Error updating tournament status:', error);
    const errorEmbed = createErrorEmbed(
      'Update Error',
      'Failed to update tournament status. Please try again later.',
      'Check server logs for details.',
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
