import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TournamentService } from '../../../../services/tournament/tournament.services';
import { TournamentStatus } from '../../../../database/enums/tournament-status.enums';
import { TournamentFormat } from '../../../../database/enums/tournament-format.enums';

const tournamentService = new TournamentService();

export async function handleCreateTournament(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const name = interaction.options.getString('name', true);
    const game = interaction.options.getString('game', true);
    const format = interaction.options.getString('format', true);
    const tiers = interaction.options.getInteger('tiers', true);
    const startDateStr = interaction.options.getString('start_date', true);
    const endDateStr = interaction.options.getString('end_date', true);
    const description = interaction.options.getString('description') || undefined;

    // Parse dates and ensure they maintain their original time regardless of timezone
    const parseDateWithOriginalTime = (dateString: string): Date => {
      // Parse the date string to extract components
      const [datePart, timePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0];
      
      // Create a date object with the exact components in the local timezone
      // Note: month is 0-indexed in JavaScript Date
      const date = new Date(year, month - 1, day, hours, minutes);
      
      return date;
    };
    
    // Parse dates
    const startDate = parseDateWithOriginalTime(startDateStr);
    const endDate = parseDateWithOriginalTime(endDateStr);

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
      format: format as TournamentFormat,
      maxTiers: tiers,
      tierLimits,
      startDate,
      endDate,
      status: TournamentStatus.UPCOMING,
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

    // Format dates for better display
    const formattedStartDate = `<t:${Math.floor(startDate.getTime() / 1000)}:F>`;
    const formattedEndDate = `<t:${Math.floor(endDate.getTime() / 1000)}:F>`;
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Admin confirmation embed with tournament details
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🏆 Tournament Created: ${name}`)
      .setDescription(`The tournament has been successfully created and is ready to go!`)
      .addFields(
        { name: '🎮 Game', value: game, inline: true },
        { name: '🎯 Format', value: format, inline: true },
        { name: '🏅 Tiers', value: `${tiers} tiers (pyramid structure)`, inline: true },
        { name: '📅 Start Date', value: formattedStartDate, inline: true },
        { name: '🔚 End Date', value: formattedEndDate, inline: true },
        { name: '⏱️ Duration', value: `${duration} days`, inline: true },
        { name: '🔑 Tournament ID', value: `\`${tournament.tournamentId}\``, inline: false },
        {
          name: '📝 Description',
          value: description || 'No description provided.',
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot • Tournament Management' });

    await interaction.editReply({ embeds: [embed] });

    // Send public announcement to channel with more attractive formatting
    if (interaction.channel && 'send' in interaction.channel) {
      // Build tier visualization
      let tiersDisplay = '';
      for (let i = 0; i < tiers; i++) {
        const tier = i + 1;
        const limit = tierLimits[i];
        tiersDisplay += `**Tier ${tier}**: ${limit} team${limit !== 1 ? 's' : ''} max\n`;
      }

      // Build prizes display
      const prizesDisplay = [
        `🥇 **1st Place**: €${tournament.rewards.first}`,
        `🥈 **2nd Place**: €${tournament.rewards.second}`,
        `🥉 **3rd Place**: €${tournament.rewards.third}`,
      ].join('\n');

      const publicEmbed = new EmbedBuilder()
        .setColor('#9900ff')
        .setTitle(`🏆 New Tournament: ${name}`)
        .setDescription(
          `**A new challenge approaches!**\n\n` +
            `The **${name}** tournament has been announced and will begin on ${formattedStartDate}!\n\n` +
            `${description || 'Get ready to compete for glory and prizes!'}`,
        )
        .addFields(
          {
            name: '🎮 Tournament Details',
            value: [
              `**Game**: ${game}`,
              `**Format**: ${format}`,
              `**Duration**: ${duration} days`,
              `**Start**: ${formattedStartDate}`,
              `**End**: ${formattedEndDate}`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🏅 Tournament Structure',
            value: tiersDisplay,
            inline: true,
          },
          {
            name: '💰 Prizes',
            value: prizesDisplay,
            inline: false,
          },
          {
            name: '📋 How to Join',
            value: 'Create a team with `/team create` and register for the tournament!',
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Registration is now open! • Twinspire Bot' });

      await interaction.channel.send({ embeds: [publicEmbed] });
    }
  } catch (error) {
    logger.error('Error creating tournament:', error);
    await interaction.editReply('Failed to create tournament. Check logs for details.');
  }
}
