// src/commands/commands/tournament/standings.command.ts
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

const tournamentService = new TournamentService();

export async function handleViewStandings(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const tournamentId = interaction.options.getString('tournament_id');

    // Get tournament standings
    const teams = await tournamentService.getTournamentStandings(tournamentId || '');

    if (teams.length === 0) {
      await interaction.editReply('No teams found in the tournament.');
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

    for (const tier of sortedTiers) {
      const tierTeams = tierGroups.get(tier) || [];

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Tier ${tier} Standings`)
        .setDescription(`Teams in Tier ${tier}, sorted by prestige points`)
        .setTimestamp()
        .setFooter({ text: 'Twinspire Bot' });

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

        embed.addFields({
          name: `${index + 1}. ${teamData.name}`,
          value: [
            `**Captain**: <@${teamData.captainId}>`,
            `**Prestige**: ${teamData.prestige} points`,
            `**Record**: ${teamData.wins}-${teamData.losses}`,
            `**Win Streak**: ${teamData.winStreak}`,
            teamData.protectedUntil && teamData.protectedUntil > new Date()
              ? `**Protected Until**: <t:${Math.floor(teamData.protectedUntil.getTime() / 1000)}:R>`
              : `**Status**: Challengeable`,
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
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next Tier')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(embeds.length <= 1),
        );

        const response = await interaction.editReply({
          embeds: [embeds[0]],
          components: [row],
        });

        // Create collector for button interactions
        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60000,
        });

        collector.on('collect', async i => {
          if (i.user.id !== interaction.user.id) {
            await i.reply({ content: 'You cannot use these buttons.', ephemeral: true });
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
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next Tier')
              .setStyle(ButtonStyle.Primary)
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
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next Tier')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
          );

          await interaction.editReply({
            embeds: [embeds[currentPage]],
            components: [row],
          });
        });
      }
    } else {
      await interaction.editReply('No team standings available.');
    }
  } catch (error) {
    logger.error('Error viewing tournament standings:', error);
    await interaction.editReply('Failed to retrieve tournament standings. Check logs for details.');
  }
}
