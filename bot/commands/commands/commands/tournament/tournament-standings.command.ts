import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TournamentService } from '../../../../services/tournament/tournament.services';
import {
  StatusIcons,
  MessageColors,
  createErrorEmbed,
  createInfoEmbed,
  formatTimestamp,
} from '../../../../helpers/message.helpers';

const tournamentService = new TournamentService();

export async function handleViewStandings(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const tournamentId = interaction.options.getString('tournament_id');

    // Get tournament standings
    const teams = await tournamentService.getTournamentStandings(tournamentId || '');
    const tournament = await tournamentService.getTournamentById(tournamentId || '');

    if (teams.length === 0) {
      const noTeamsEmbed = createInfoEmbed(
        'No Teams Found',
        `No teams have registered for this tournament yet.`,
      );
      await interaction.editReply({ embeds: [noTeamsEmbed] });
      return;
    }

    // Group teams by tier
    const tierGroups = new Map<number, typeof teams>();
    teams.forEach(team => {
      if (!tierGroups.has(team.tier)) {
        tierGroups.set(team.tier, []);
      }
      tierGroups.get(team.tier)?.push(team);
    });

    // Sort tiers (ascending) and teams within tiers by prestige (descending)
    const sortedTiers = Array.from(tierGroups.keys()).sort((a, b) => a - b);

    // Create embeds for each tier
    const embeds: EmbedBuilder[] = [];
    const tournamentName = tournament ? tournament.name : 'Tournament';

    for (const tier of sortedTiers) {
      const tierTeams = tierGroups.get(tier) || [];
      const tierColor =
        tier === 1
          ? MessageColors.TOURNAMENT
          : tier === 2
            ? ('#C0C0C0' as const)
            : tier === 3
              ? ('#CD7F32' as const)
              : MessageColors.TEAM;

      // Create embed using helper
      const embed = new EmbedBuilder()
        .setColor(tierColor)
        .setTitle(`${StatusIcons.TROPHY} ${tournamentName} - Tier ${tier} Standings`)
        .setDescription(
          `${tier === 1 ? StatusIcons.STAR + ' ' : ''}` +
            `**Tier ${tier}** Teams ${tier === 1 ? '(Top Tier)' : ''} | ` +
            `Sorted by prestige points`,
        )
        .setTimestamp()
        .setFooter({ text: `Twinspire Bot • Page ${tier} of ${sortedTiers.length}` });

      // Add each team in this tier
      tierTeams.forEach((team, index) => {
        const teamData = {
          name: team.team.name,
          captainId: team.team.captainId,
          prestige: team.prestige,
          wins: team.wins,
          losses: team.losses,
          winStreak: team.winStreak,
          protectedUntil: team.protectedUntil,
        };

        // Add ranking medal for top 3 teams in tier 1
        const rankPrefix =
          tier === 1 && index === 0
            ? '🥇 '
            : tier === 1 && index === 1
              ? '🥈 '
              : tier === 1 && index === 2
                ? '🥉 '
                : `${index + 1}. `;

        // Create status text with icon
        const statusText =
          teamData.protectedUntil && teamData.protectedUntil > new Date()
            ? `${StatusIcons.PROTECTED} **Protected Until**: ${formatTimestamp(teamData.protectedUntil, 'R')}`
            : `${StatusIcons.UNLOCKED} **Status**: Challengeable`;

        // Win streak icon based on streak length
        const streakIcon = teamData.winStreak >= 5 ? '🔥' : teamData.winStreak >= 3 ? '✨' : '';

        embed.addFields({
          name: `${rankPrefix}${teamData.name}`,
          value: [
            `${StatusIcons.CROWN} **Captain**: <@${teamData.captainId}>`,
            `${StatusIcons.STAR} **Prestige**: ${teamData.prestige} points`,
            `📊 **Record**: ${teamData.wins}-${teamData.losses}`,
            `${streakIcon} **Win Streak**: ${teamData.winStreak}${streakIcon}`,
            statusText,
          ].join('\n'),
          inline: true,
        });
      });

      embeds.push(embed);
    }

    // Send the first embed
    if (embeds.length > 0) {
      if (embeds.length === 1) {
        await interaction.editReply({ embeds: [embeds[0]] });
      } else {
        // Create pagination if there are multiple tiers
        let currentPage = 0;

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous Tier')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⬆️')
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next Tier')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⬇️')
            .setDisabled(embeds.length <= 1),
        );

        const response = await interaction.editReply({
          embeds: [embeds[0]],
          components: [row],
        });

        // Create collector for button interactions
        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 120000, // Extended time to 2 minutes
        });

        collector.on('collect', async i => {
          if (i.user.id !== interaction.user.id) {
            await i.reply({
              content: `${StatusIcons.ERROR} Only ${interaction.user.toString()} can use these buttons.`,
              ephemeral: true,
            });
            return;
          }

          await i.deferUpdate();

          if (i.customId === 'prev') {
            if (currentPage > 0) {
              currentPage--;
            }
          } else if (i.customId === 'next') {
            if (currentPage < embeds.length - 1) {
              currentPage++;
            }
          }

          // Update buttons
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Previous Tier')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('⬆️')
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next Tier')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('⬇️')
              .setDisabled(currentPage === embeds.length - 1),
          );

          await interaction.editReply({
            embeds: [embeds[currentPage]],
            components: [row],
          });
        });

        collector.on('end', async () => {
          // Disable all buttons when collector ends
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Previous Tier')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⬆️')
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next Tier')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⬇️')
              .setDisabled(true),
          );

          await interaction.editReply({
            embeds: [embeds[currentPage]],
            components: [row],
          });
        });
      }
    } else {
      const noStandingsEmbed = createInfoEmbed(
        'No Standings Available',
        'Could not generate tournament standings.',
      );
      await interaction.editReply({ embeds: [noStandingsEmbed] });
    }
  } catch (error) {
    logger.error('Error viewing tournament standings:', error);
    const errorEmbed = createErrorEmbed(
      'Standings Error',
      'Failed to retrieve tournament standings.',
      'Please check server logs for details.',
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
