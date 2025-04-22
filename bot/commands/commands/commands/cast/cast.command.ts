import { ChatInputCommandInteraction, EmbedBuilder, TextChannel, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { createErrorEmbed, MessageColors, StatusIcons } from '../../../../helpers/message.helpers';
import { MatchType } from '../../../../database/enums/match.enums';
import { TournamentFormat } from '../../../../database/enums/tournament-format.enums';
import CastDemand from '../../../../database/models/cast-demand.model';
import Team from '../../../../database/models/team.model';

const CAST_CHANNEL_NAME = '📺│demande-cast';

export async function handleCast(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const eventType = interaction.options.getString('event_type', true) as MatchType;
    const opponentTeam = interaction.options.getString('opponent_team', true);
    const date = interaction.options.getString('date', true);
    const time = interaction.options.getString('time', true);
    const gameMode = interaction.options.getString('game_mode', true);
    const matchFormat = interaction.options.getString('match_format', true) as TournamentFormat;
    const opponentOpgg = interaction.options.getString('opponent_opgg', true);
    const opponentLogo = interaction.options.getAttachment('opponent_logo');

    const team = await Team.findOne({
      'members.discordId': interaction.user.id,
    });

    if (!team) {
      throw new Error('You are not a member of any team');
    }

    if (!team.discordRole) {
      throw new Error('Your team does not have a Discord role configured');
    }

    const embed = new EmbedBuilder()
      .setTitle(`${StatusIcons.CALENDAR} Cast Demand`)
      .setColor(MessageColors.TEAM)
      .addFields(
        { name: `${StatusIcons.TROPHY} Event Type`, value: eventType, inline: true },
        {
          name: `${StatusIcons.STAR} Match`,
          value: `${team.discordRole} vs ${opponentTeam}`,
          inline: true,
        },
        { name: `${StatusIcons.TIME} Date & Time`, value: `${date} at ${time}`, inline: true },
        { name: `${StatusIcons.INFO} Game Mode`, value: gameMode, inline: true },
        { name: `${StatusIcons.PROTECTED} Format`, value: matchFormat, inline: true },
        { name: `${StatusIcons.UP} Opponent OP.GG`, value: opponentOpgg, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot • Cast Demand' });

    if (opponentLogo) {
      embed.setThumbnail(opponentLogo.url);
    }

    const guild = interaction.guild;
    if (!guild) {
      throw new Error('Guild not found');
    }

    const castChannel = guild.channels.cache.find(
      channel => channel.name === CAST_CHANNEL_NAME && channel instanceof TextChannel,
    ) as TextChannel | undefined;

    if (!castChannel) {
      throw new Error('Cast channel not found');
    }

    // Find the Caster role
    const casterRole = guild.roles.cache.find(role => role.name === 'Caster');
    if (!casterRole) {
      throw new Error('Caster role not found');
    }

    // Create accept button
    const acceptButton = new ButtonBuilder()
      .setCustomId('accept_cast')
      .setLabel('Accept Cast')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton);

    const message = await castChannel.send({ 
      content: `<@&${casterRole.id}>`,
      embeds: [embed],
      components: [row]
    });

    // Save cast demand to database
    const castDemand = await CastDemand.create({
      eventType,
      opponentTeam,
      date,
      time,
      gameMode,
      matchFormat,
      opponentOpgg,
      opponentLogo: opponentLogo?.url,
      messageId: message.id,
      channelId: castChannel.id,
      status: 'PENDING',
      teamDiscordRole: team.discordRole
    });

    // Update button customId with cast demand ID
    acceptButton.setCustomId(`accept_cast_${castDemand._id}`);
    await message.edit({ components: [row] });

    await interaction.editReply({
      content: `Cast demand has been posted in ${castChannel}!`,
    });
  } catch (error) {
    logger.error('Error handling cast command:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('Error', 'Failed to process cast demand')],
    });
  }
}
