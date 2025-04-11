import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { RiotApiService } from '../../../../services/riot-games/riot-api.services';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import { TeamService } from '../../../../services/tournament/team.services';
import {
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
  StatusIcons,
} from '../../../../helpers/message.helpers';
import { checkAdminRole } from '../../../../utils/role.utils';
import { ITeam, ITeamMember } from '../../../../database/models/team.model';
import { Team } from '../../../../database/models';

const challengeService = new ChallengeService();
const teamService = new TeamService();
const riotApiService = new RiotApiService();

export async function handleVerifyMatch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    // Check if user has admin permissions for this command
    const isAdmin = await checkAdminRole(interaction);

    const challengeId = interaction.options.getString('challenge_id', true);
    const matchId = interaction.options.getString('match_id', true);

    // Get challenge details
    const challenge = await challengeService.getChallengeById(challengeId);

    if (!challenge) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Challenge Not Found',
            `Challenge with ID \`${challengeId}\` not found.`,
            'Please verify the challenge ID and try again.',
          ),
        ],
      });
      return;
    }

    // Get participating teams
    // Get the team IDs from the TeamTournament documents
    const challengerTeamTournament = await Team.findById(challenge.challengerTeamTournament.team);
    const defendingTeamTournament = await Team.findById(challenge.defendingTeamTournament.team);
    
    if (!challengerTeamTournament || !defendingTeamTournament) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Teams Not Found',
            'Could not find one or both teams involved in this challenge.',
            'This may indicate a data inconsistency issue.',
          ),
        ],
      });
      return;
    }
    
    const challengerTeam = await teamService.getTeamByTeamId(challengerTeamTournament.teamId);
    const defendingTeam = await teamService.getTeamByTeamId(defendingTeamTournament.teamId);

    if (!challengerTeam || !defendingTeam) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Teams Not Found',
            'Could not find one or both teams involved in this challenge.',
            'This may indicate a data inconsistency issue.',
          ),
        ],
      });
      return;
    }

    // Extract summoner names from team members' opgg fields
    const getSummonerNamesFromTeam = (team: ITeam): string[] => {
      return team.members
        .filter((member: ITeamMember) => member.opgg && typeof member.opgg === 'string')
        .map((member: ITeamMember) => {
          // Extract summoner name from opgg URL
          const opggUrl = member.opgg || '';
          const match = opggUrl.match(/\/summoners\/[^\/]+\/([^\/]+)/i);
          if (match && match[1]) {
            // Replace URL encoding with actual characters
            return decodeURIComponent(match[1].replace(/-/g, ' '));
          }
          return null;
        })
        .filter(Boolean) as string[]; // Remove nulls
    };

    const challengerSummoners = getSummonerNamesFromTeam(challengerTeam);
    const defendingSummoners = getSummonerNamesFromTeam(defendingTeam);

    if (challengerSummoners.length < 1 || defendingSummoners.length < 1) {
      await interaction.editReply({
        embeds: [
          createWarningEmbed(
            'Missing Summoner Names',
            "Could not extract enough summoner names from team members' OP.GG links. Please make sure team members have valid OP.GG links with their summoner names."
          ),
        ],
      });
      return;
    }

    // Call Riot API to verify the match
    const verification = await riotApiService.verifyTeamMatch(
      matchId,
      challengerSummoners,
      defendingSummoners,
    );

    if (!verification.verified) {
      // If not verified, show error with reason
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Match Verification Failed',
            `This match could not be verified as a valid match between the two teams.`,
            `Reason: ${verification.error || 'Unknown error'}`,
          ),
        ],
      });
      return;
    }

    // Determine winning team
    const winnerTeamId =
      verification.winningTeam === 1 ? challengerTeam.teamId : defendingTeam.teamId;

    const winnerTeamName =
      verification.winningTeam === 1 ? challengerTeam.name : defendingTeam.name;

    const loserTeamName = verification.winningTeam === 1 ? defendingTeam.name : challengerTeam.name;

    // Format match duration
    const matchDuration = verification.matchDetails?.gameDuration || 0;
    const minutes = Math.floor(matchDuration / 60);
    const seconds = matchDuration % 60;
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Create match verification embed
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle(`${StatusIcons.SUCCESS} Match Verified`)
      .setDescription(`Match \`${matchId}\` has been verified as a valid tournament match.`)
      .addFields(
        { name: 'Challenge', value: `\`${challengeId}\``, inline: true },
        { name: 'Winner', value: winnerTeamName, inline: true },
        { name: 'Loser', value: loserTeamName, inline: true },
        { name: 'Match Duration', value: formattedDuration, inline: true },
        {
          name: 'Match Date',
          value: verification.matchDetails?.gameCreation
            ? `<t:${Math.floor(verification.matchDetails.gameCreation / 1000)}:F>`
            : 'Unknown',
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'Riot API Verification' });

    await interaction.editReply({ embeds: [embed] });

    // If the user is an admin, offer to automatically submit the result
    if (isAdmin) {
      const score = '1-0'; // Default for single match

      // Create games array format needed for submitChallengeResult
      const games = [
        {
          winner: winnerTeamId,
          loser: verification.winningTeam === 1 ? defendingTeam.teamId : challengerTeam.teamId,
          duration: matchDuration,
        },
      ];

      // Submit the result if admin
      const success = await challengeService.submitChallengeResult(
        challengeId,
        winnerTeamId,
        score,
        games,
      );

      if (success) {
        // Send confirmation as a follow-up message
        await interaction.followUp({
          embeds: [
            createSuccessEmbed(
              'Result Submitted',
              `The match result has been automatically submitted to update the tournament standings.`,
            ),
          ],
          ephemeral: true,
        });
      } else {
        // Error submitting result
        await interaction.followUp({
          embeds: [
            createErrorEmbed(
              'Error Submitting Result',
              'The match was verified, but there was an error submitting the result.',
              'You may need to submit the result manually using /team-challenge submit_result.',
            ),
          ],
          ephemeral: true,
        });
      }
    }
  } catch (error) {
    logger.error('Error verifying match:', error);

    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Verification Error',
          'An error occurred while verifying the match.',
          'This could be due to Riot API issues or rate limiting.',
        ),
      ],
    });
  }
}
