// src/commands/tournament.ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { TournamentService } from '../../services/tournament/tournament.services';
import { logger } from '../../utils/logger.utils';

const tournamentService = new TournamentService();

export default {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Tournament management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // Create a new tournament
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new tournament')
        .addStringOption(option =>
          option.setName('name').setDescription('Tournament name').setRequired(true),
        )
        .addStringOption(option =>
          option.setName('game').setDescription('Game for the tournament').setRequired(true),
        )
        .addStringOption(option =>
          option.setName('format').setDescription('Match format (e.g., BO3)').setRequired(true),
        )
        .addIntegerOption(option =>
          option
            .setName('tiers')
            .setDescription('Number of tiers in the tournament')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10),
        )
        .addStringOption(option =>
          option.setName('start_date').setDescription('Start date (YYYY-MM-DD)').setRequired(true),
        )
        .addStringOption(option =>
          option.setName('end_date').setDescription('End date (YYYY-MM-DD)').setRequired(true),
        )
        .addStringOption(option =>
          option.setName('description').setDescription('Tournament description').setRequired(false),
        ),
    )
    // View tournament details
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View tournament details')
        .addStringOption(option =>
          option
            .setName('tournament_id')
            .setDescription('Tournament ID')
            .setRequired(false)
            .setAutocomplete(true),
        ),
    )
    // List all tournaments
    .addSubcommand(subcommand => subcommand.setName('list').setDescription('List all tournaments'))
    // Update tournament status
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Update tournament status')
        .addStringOption(option =>
          option
            .setName('tournament_id')
            .setDescription('Tournament ID')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('New status')
            .setRequired(true)
            .addChoices(
              { name: 'Upcoming', value: 'upcoming' },
              { name: 'Active', value: 'active' },
              { name: 'Completed', value: 'completed' },
            ),
        ),
    )
    // View tournament standings
    .addSubcommand(subcommand =>
      subcommand
        .setName('standings')
        .setDescription('View tournament standings')
        .addStringOption(option =>
          option
            .setName('tournament_id')
            .setDescription('Tournament ID')
            .setRequired(false)
            .setAutocomplete(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'create':
          await handleCreateTournament(interaction);
          break;
        case 'view':
          await handleViewTournament(interaction);
          break;
        case 'list':
          await handleListTournaments(interaction);
          break;
        case 'status':
          await handleUpdateStatus(interaction);
          break;
        case 'standings':
          await handleViewStandings(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (error) {
      logger.error(`Error executing tournament ${subcommand} command:`, error as Error);
      await interaction.reply({
        content: 'An error occurred while processing the command. Please check the logs.',
        ephemeral: true,
      });
    }
  },
};

/**
 * Handle the tournament create command
 */
async function handleCreateTournament(interaction: ChatInputCommandInteraction) {
  // Defer the reply as this might take a moment
  await interaction.deferReply({ ephemeral: true });

  try {
    const name = interaction.options.getString('name', true);
    const game = interaction.options.getString('game', true);
    const format = interaction.options.getString('format', true);
    const tiers = interaction.options.getInteger('tiers', true);
    const startDateStr = interaction.options.getString('start_date', true);
    const endDateStr = interaction.options.getString('end_date', true);
    const description = interaction.options.getString('description') || undefined;

    // Parse dates
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      await interaction.editReply('Invalid date format. Please use YYYY-MM-DD.');
      return;
    }

    if (startDate >= endDate) {
      await interaction.editReply('End date must be after start date.');
      return;
    }

    // Create tier limits based on Twinspire Ascension rules
    // Pyramid structure with fewer teams at higher tiers
    const tierLimits = [];
    for (let i = 1; i <= tiers; i++) {
      // Basic formula for a pyramid: more teams in lower tiers
      // Tier 1 (highest) has 1 team, then 2, 4, 8, etc.
      tierLimits.push(Math.pow(2, i - 1));
    }

    // Create tournament with default rules based on Twinspire Ascension document
    const tournament = await tournamentService.createTournament({
      name,
      description,
      game,
      format,
      maxTiers: tiers,
      tierLimits,
      startDate,
      endDate,
      status: 'upcoming',
      rules: {
        challengeTimeframeInDays: 10, // 10 days to complete challenges
        protectionDaysAfterDefense: 7, // 7 days protection after successful defense
        maxChallengesPerMonth: 3, // Max 3 challenges per month
        minRequiredDateOptions: 3, // Minimum 3 date options
      },
      rewards: {
        first: 250, // €250 for 1st place
        second: 50, // €50 for 2nd place (split from the 100)
        third: 50, // €50 for 3rd place (split from the 100)
      },
    });

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Tournament Created')
      .setDescription(`**${name}** has been created successfully!`)
      .addFields(
        { name: 'Game', value: game, inline: true },
        { name: 'Format', value: format, inline: true },
        { name: 'Tiers', value: tiers.toString(), inline: true },
        { name: 'Start Date', value: startDate.toLocaleDateString(), inline: true },
        { name: 'End Date', value: endDate.toLocaleDateString(), inline: true },
        { name: 'Tournament ID', value: tournament.tournamentId, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    await interaction.editReply({ embeds: [embed] });

    // Send notification to channel
    if (interaction.channel) {
      const publicEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('New Tournament Announced!')
        .setDescription(`**${name}** will be starting on ${startDate.toLocaleDateString()}!`)
        .addFields(
          { name: 'Game', value: game, inline: true },
          { name: 'Format', value: format, inline: true },
          {
            name: 'Duration',
            value: `${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days`,
            inline: true,
          },
          { name: 'Description', value: description || 'No description provided.' },
        )
        .setTimestamp()
        .setFooter({ text: 'Use /team create to register your team!' });

      if (interaction.channel && 'send' in interaction.channel) {
        await interaction.channel.send({ embeds: [publicEmbed] });
      }
    }
  } catch (error) {
    logger.error('Error creating tournament:', error as Error);
    await interaction.editReply('Failed to create tournament. Check logs for details.');
  }
}

/**
 * Handle the tournament view command
 */
async function handleViewTournament(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const tournamentId = interaction.options.getString('tournament_id');

    // If no tournament ID is provided, show the most recent active tournament
    let tournament;
    if (!tournamentId) {
      const activeTournaments = await tournamentService.getActiveTournaments();
      if (activeTournaments.length === 0) {
        await interaction.editReply('No active tournaments found.');
        return;
      }

      // Sort by start date, descending
      tournament = activeTournaments.sort(
        (a, b) => b.startDate.getTime() - a.startDate.getTime(),
      )[0];
    } else {
      tournament = await tournamentService.getTournamentById(tournamentId);
      if (!tournament) {
        await interaction.editReply(`Tournament with ID ${tournamentId} not found.`);
        return;
      }
    }

    // Create tier visualization
    let tiersDisplay = '';
    for (let i = 0; i < tournament.maxTiers; i++) {
      const tier = i + 1;
      const limit = tournament.tierLimits[i];
      tiersDisplay += `**Tier ${tier}**: ${limit} team${limit !== 1 ? 's' : ''} max\n`;
    }

    // Create rules display
    const rules = tournament.rules;
    const rulesDisplay = [
      `• Challenges must be completed within **${rules.challengeTimeframeInDays} days**`,
      `• Teams are protected for **${rules.protectionDaysAfterDefense} days** after successful defense`,
      `• Teams can initiate up to **${rules.maxChallengesPerMonth} challenges per month**`,
      `• Defending teams must propose at least **${rules.minRequiredDateOptions} schedule options**`,
    ].join('\n');

    // Create rewards display
    const rewards = tournament.rewards;
    const rewardsDisplay = [
      `• 1st Place: €${rewards.first}`,
      `• 2nd Place: €${rewards.second}`,
      `• 3rd Place: €${rewards.third}`,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(tournament.name)
      .setDescription(tournament.description || 'No description provided.')
      .addFields(
        {
          name: 'Status',
          value: tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1),
          inline: true,
        },
        { name: 'Game', value: tournament.game, inline: true },
        { name: 'Format', value: tournament.format, inline: true },
        {
          name: 'Start Date',
          value: `<t:${Math.floor(tournament.startDate.getTime() / 1000)}:D>`,
          inline: true,
        },
        {
          name: 'End Date',
          value: `<t:${Math.floor(tournament.endDate.getTime() / 1000)}:D>`,
          inline: true,
        },
        { name: 'Tournament ID', value: tournament.tournamentId, inline: true },
        { name: 'Tier Structure', value: tiersDisplay, inline: false },
        { name: 'Rules', value: rulesDisplay, inline: false },
        { name: 'Rewards', value: rewardsDisplay, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error viewing tournament:', error as Error);
    await interaction.editReply('Failed to retrieve tournament details. Check logs for details.');
  }
}

/**
 * Handle the tournament list command
 */
async function handleListTournaments(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const tournaments = await tournamentService.getActiveTournaments();

    if (tournaments.length === 0) {
      await interaction.editReply('No active tournaments found.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Active Tournaments')
      .setDescription(`Found ${tournaments.length} active tournament(s)`)
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    // Add each tournament as a field
    tournaments.forEach((tournament, index) => {
      embed.addFields({
        name: `${index + 1}. ${tournament.name}`,
        value: [
          `**ID**: ${tournament.tournamentId}`,
          `**Game**: ${tournament.game}`,
          `**Format**: ${tournament.format}`,
          `**Status**: ${tournament.status}`,
          `**Period**: <t:${Math.floor(tournament.startDate.getTime() / 1000)}:D> to <t:${Math.floor(tournament.endDate.getTime() / 1000)}:D>`,
        ].join('\n'),
        inline: false,
      });
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error listing tournaments:', error as Error);
    await interaction.editReply('Failed to retrieve tournaments list. Check logs for details.');
  }
}

/**
 * Handle the tournament status update command
 */
async function handleUpdateStatus(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const tournamentId = interaction.options.getString('tournament_id', true);
    const newStatus = interaction.options.getString('status', true) as
      | 'upcoming'
      | 'active'
      | 'completed';

    const tournament = await tournamentService.getTournamentById(tournamentId);
    if (!tournament) {
      await interaction.editReply(`Tournament with ID ${tournamentId} not found.`);
      return;
    }

    // Update the tournament status
    const success = await tournamentService.updateTournament(tournamentId, { status: newStatus });

    if (success) {
      await interaction.editReply(
        `Tournament **${tournament.name}** status updated to **${newStatus}**.`,
      );

      // Send notification to channel
      if (interaction.channel) {
        const publicEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('Tournament Status Updated')
          .setDescription(`**${tournament.name}** is now **${newStatus}**.`)
          .setTimestamp()
          .setFooter({ text: 'Twinspire Bot' });

        if (interaction.channel && 'send' in interaction.channel) {
          await interaction.channel.send({ embeds: [publicEmbed] });
        }
      }
    } else {
      await interaction.editReply(`Failed to update tournament status.`);
    }
  } catch (error) {
    logger.error('Error updating tournament status:', error as Error);
    await interaction.editReply('Failed to update tournament status. Check logs for details.');
  }
}

/**
 * Handle the tournament standings command
 */
async function handleViewStandings(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    // Get tournament standings
    const teams = await tournamentService.getTournamentStandings();

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
        embed.addFields({
          name: `${index + 1}. ${team.name}`,
          value: [
            `**Captain**: <@${team.captainId}>`,
            `**Prestige**: ${team.prestige} points`,
            `**Record**: ${team.wins}-${team.losses}`,
            `**Win Streak**: ${team.winStreak}`,
            team.protectedUntil && team.protectedUntil > new Date()
              ? `**Protected Until**: <t:${Math.floor(team.protectedUntil.getTime() / 1000)}:R>`
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
    logger.error('Error viewing tournament standings:', error as Error);
    await interaction.editReply('Failed to retrieve tournament standings. Check logs for details.');
  }
}
