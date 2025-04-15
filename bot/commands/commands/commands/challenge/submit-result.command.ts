import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextChannel,
} from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import {
  createErrorEmbed,
  createChallengeEmbed,
  StatusIcons,
} from '../../../../helpers/message.helpers';
import { TeamTournament, Team } from '../../../../database/models';
import { ChallengeStatus } from '../../../../database/enums/challenge.enums';

const challengeService = new ChallengeService();

export async function handleSubmitResult(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const result = interaction.options.getString('result', true);
    const score = interaction.options.getString('score', true);

    // Get all screenshots
    const screenshots = [];
    for (let i = 1; i <= 5; i++) {
      const screenshot = interaction.options.getAttachment(`screenshot${i}`);
      if (screenshot) {
        screenshots.push(screenshot);
      }
    }

    // Parse the score to determine the number of games
    const [winnerScore, loserScore] = score.split('-').map(Number);
    const totalGames = winnerScore + loserScore;

    // Create game results based on the score
    // For simplicity, we'll assume the first games were won by the winner
    const games = [];
    for (let i = 0; i < totalGames; i++) {
      if (i < winnerScore) {
        games.push({ winner: 'winner', loser: 'loser' });
      } else {
        games.push({ winner: 'loser', loser: 'winner' });
      }
    }

    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      const embed = createErrorEmbed(
        'Challenge Not Found',
        `Challenge ${challengeId} does not exist.`,
        'Please verify the challenge ID and try again.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Check if the challenge is already completed
    if (
      challenge.status === ChallengeStatus.COMPLETED ||
      challenge.status === ChallengeStatus.CANCELLED
    ) {
      const embed = createErrorEmbed(
        'Challenge Already Completed',
        `Challenge ${challengeId} has already been completed.`,
        'Results cannot be submitted for completed challenges.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Get team names for better display
    // Check if challengerTeamTournament is an ObjectId or already populated
    const challengerTeamTournamentId =
      typeof challenge.challengerTeamTournament === 'string'
        ? challenge.challengerTeamTournament
        : challenge.challengerTeamTournament._id || challenge.challengerTeamTournament;

    const challengerTeamTournament = await TeamTournament.findById(
      challengerTeamTournamentId,
    ).populate({
      path: 'team',
      select: 'name discordRole',
    });
    console.log(
      `LOG || handleSubmitResult || challengerTeamTournament ->`,
      challengerTeamTournament,
    );

    // Check if defendingTeamTournament is an ObjectId or already populated
    const defendingTeamTournamentId =
      typeof challenge.defendingTeamTournament === 'string'
        ? challenge.defendingTeamTournament
        : (challenge.defendingTeamTournament as any)._id || challenge.defendingTeamTournament;

    const defendingTeamTournament = await TeamTournament.findById(
      defendingTeamTournamentId,
    ).populate({
      path: 'team',
      select: 'name discordRole',
    });
    console.log(`LOG || handleSubmitResult || defendingTeamTournament ->`, defendingTeamTournament);

    // Determine which team the user belongs to
    const challengerTeam = await Team.findById(challengerTeamTournament?.team);
    const defendingTeam = await Team.findById(defendingTeamTournament?.team);

    const isChallengerMember = challengerTeam?.members.some(
      member => member.discordId === interaction.user.id,
    );
    const isDefenderMember = defendingTeam?.members.some(
      member => member.discordId === interaction.user.id,
    );

    if (!isChallengerMember && !isDefenderMember) {
      const embed = createErrorEmbed(
        'Permission Denied',
        'You must be a member of one of the teams involved in this challenge to submit a result.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Determine winner based on the user's team and the result
    const isWinner = result === 'win';
    const winnerTeamId = isChallengerMember
      ? isWinner
        ? challengerTeamTournamentId.toString()
        : defendingTeamTournamentId.toString()
      : isWinner
        ? defendingTeamTournamentId.toString()
        : challengerTeamTournamentId.toString();

    const loserTeamId = isChallengerMember
      ? isWinner
        ? defendingTeamTournamentId.toString()
        : challengerTeamTournamentId.toString()
      : isWinner
        ? challengerTeamTournamentId.toString()
        : defendingTeamTournamentId.toString();

    // Map the generic 'winner'/'loser' to actual team IDs
    const mappedGames = games.map(game => ({
      winner: game.winner === 'winner' ? winnerTeamId : loserTeamId,
      loser: game.loser === 'winner' ? winnerTeamId : loserTeamId,
    }));

    const success = await challengeService.submitChallengeResult(
      challengeId,
      winnerTeamId,
      score,
      mappedGames,
    );

    if (success) {
      // Get the updated challenge to access tier and prestige information
      const updatedChallenge = await challengeService.getChallengeById(challengeId);

      // Get team names for better display
      const challengerTeamTournament = await TeamTournament.findById(
        updatedChallenge?.challengerTeamTournament,
      ).populate({
        path: 'team',
        select: 'name discordRole',
      });

      const defendingTeamTournament = await TeamTournament.findById(
        updatedChallenge?.defendingTeamTournament,
      ).populate({
        path: 'team',
        select: 'name discordRole',
      });

      // Determine winner and loser teams based on the IDs
      const winnerTeamTournament =
        winnerTeamId === challengerTeamTournament?._id.toString()
          ? challengerTeamTournament
          : defendingTeamTournament;

      const loserTeamTournament =
        winnerTeamId === challengerTeamTournament?._id.toString()
          ? defendingTeamTournament
          : challengerTeamTournament;

      // Get the team data for both winner and loser
      const winnerTeam = winnerTeamTournament?.team;
      const loserTeam = loserTeamTournament?.team;

      const winnerRoleName = winnerTeam?.discordRole || winnerTeam?.name || 'Winner Team';
      const loserRoleName = loserTeam?.discordRole || loserTeam?.name || 'Loser Team';

      // Create multiple embeds for pagination
      const embeds: EmbedBuilder[] = [];

      // First embed - Challenge Result Summary
      const summaryEmbed = createChallengeEmbed(
        challengeId,
        'Completed',
        `${StatusIcons.TROPHY} Challenge result submitted successfully!`,
      ).addFields(
        { name: 'Winner', value: `${winnerRoleName}`, inline: true },
        { name: 'Loser', value: `${loserRoleName}`, inline: true },
        { name: 'Score', value: score, inline: true },
      );
      embeds.push(summaryEmbed);

      // Second embed - Tier Changes
      const tierEmbed = createChallengeEmbed(
        challengeId,
        'Tier Changes',
        `${StatusIcons.STAR} Tier changes after the challenge:`,
      ).addFields({
        name: 'Tier Changes',
        value: `${challengerTeamTournament?.team?.name || 'Challenger'}: Tier ${updatedChallenge?.tierBefore.challenger} → ${updatedChallenge?.tierAfter?.challenger || updatedChallenge?.tierBefore.challenger}\n${defendingTeamTournament?.team?.name || 'Defender'}: Tier ${updatedChallenge?.tierBefore.defending} → ${updatedChallenge?.tierAfter?.defending || updatedChallenge?.tierBefore.defending}`,
      });
      embeds.push(tierEmbed);

      // Third embed - Prestige Points
      const prestigeEmbed = createChallengeEmbed(
        challengeId,
        'Prestige Points',
        `${StatusIcons.TROPHY} Prestige points awarded:`,
      ).addFields({
        name: 'Prestige Points',
        value: `${challengerTeamTournament?.team?.name || 'Challenger'}: +${updatedChallenge?.prestigeAwarded?.challenger || 0} points\n${defendingTeamTournament?.team?.name || 'Defender'}: +${updatedChallenge?.prestigeAwarded?.defending || 0} points`,
      });
      embeds.push(prestigeEmbed);

      // Add screenshots for each game
      if (screenshots.length > 0) {
        screenshots.forEach((screenshot, index) => {
          const gameNumber = index + 1;
          const screenshotEmbed = createChallengeEmbed(
            challengeId,
            `Game ${gameNumber} Screenshot`,
            `${StatusIcons.TROPHY} Game ${gameNumber} result screenshot:`,
          ).setImage(screenshot.url);
          embeds.push(screenshotEmbed);
        });
      }

      // Find the results channel
      const resultsChannel = interaction.guild?.channels.cache.find(
        channel => channel.name === '🎮│résultats' && channel instanceof TextChannel,
      ) as TextChannel;
      console.log(`LOG || handleSubmitResult || resultsChannel ->`, resultsChannel);

      if (!resultsChannel) {
        const embed = createErrorEmbed(
          'Channel Not Found',
          'Could not find the results channel.',
          'Please make sure the 🎮│résultats channel exists.',
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Send the first embed to the results channel
      if (embeds.length > 0) {
        if (embeds.length === 1) {
          await resultsChannel.send({ embeds: [embeds[0]] });
        } else {
          // Create pagination if there are multiple embeds
          let currentPage = 0;

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('⬅️')
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('➡️')
              .setDisabled(embeds.length <= 1),
          );

          const response = await resultsChannel.send({
            embeds: [embeds[0]],
            components: [row],
          });

          // Create collector for button interactions
          const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000, // 2 minutes
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
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⬅️')
                .setDisabled(currentPage === 0),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➡️')
                .setDisabled(currentPage === embeds.length - 1),
            );

            await response.edit({
              embeds: [embeds[currentPage]],
              components: [row],
            });
          });

          collector.on('end', async () => {
            // Disable all buttons when collector ends
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('➡️')
                .setDisabled(true),
            );

            await response.edit({
              embeds: [embeds[currentPage]],
              components: [row],
            });
          });
        }
      }

      // Send a confirmation message to the user
      await interaction.editReply({
        content: `${StatusIcons.SUCCESS} Challenge result has been posted in ${resultsChannel.toString()}`,
      });
    } else {
      const embed = createErrorEmbed(
        'Submission Failed',
        `Failed to submit result for challenge ${challengeId}.`,
        'Please verify that the challenge is in a valid state for result submission.',
      );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error submitting challenge result:', error as Error);
    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while submitting the challenge result.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
