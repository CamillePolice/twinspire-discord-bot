import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import Team, { ITeam } from '../../../../database/models/team.model';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import {
  createTeamEmbed,
  formatMembersList,
  formatTimestamp,
  formatTournamentStats,
  getChallengeStatusIcon,
  createErrorEmbed,
  createInfoEmbed,
  StatusIcons,
} from '../../../../helpers/message.helpers';

export async function handleViewTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const teamName = interaction.options.getString('team_name', false);
    let team = null;

    // If no team name is provided, try to find a team that includes the user
    if (!teamName) {
      const userTeams = await Team.find({
        members: {
          $elemMatch: {
            discordId: interaction.user.id,
          },
        },
      });

      if (userTeams.length === 0) {
        await interaction.editReply({
          embeds: [
            createInfoEmbed(
              'No Team Found',
              'You are not a member of any team. Please provide a team name or join a team first.',
            ),
          ],
        });
        return;
      }

      team = userTeams[0]; // Get the first team the user is in
    } else {
      // If team name is provided, search by name
      team = await Team.findOne({ name: teamName });

      if (!team) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Team Not Found', `Team "${teamName}" not found.`)],
        });
        return;
      }
    }

    // Get the team data
    const teamData = team.toObject() as ITeam;

    // Get team's tier information
    const teamTournament =
      team.tournaments && team.tournaments.length > 0 ? team.tournaments[0] : null;

    // Create the team embed
    const embed = createTeamEmbed(
      teamData.name,
      teamTournament
        ? formatTournamentStats(
            teamTournament.tier,
            teamTournament.prestige,
            teamTournament.wins,
            teamTournament.losses,
            teamTournament.winStreak,
          )
        : undefined,
    ).addFields(
      { name: 'Team ID', value: teamData.teamId, inline: false },
      {
        name: `${StatusIcons.CROWN} Captain`,
        value: `<@${teamData.members.find(m => m.isCaptain)?.discordId}>`,
        inline: true,
      },
    );

    // Add creation date
    if (teamData.createdAt) {
      embed.addFields({
        name: 'Created',
        value: formatTimestamp(teamData.createdAt, 'R'),
        inline: true,
      });
    }

    // Format members with roles
    const membersList = formatMembersList(teamData.members);
    embed.addFields({ name: 'Members', value: membersList, inline: false });

    // Add tournament information if available
    if (teamTournament) {
      // Add protection status if applicable
      if (teamTournament.protectedUntil && teamTournament.protectedUntil > new Date()) {
        embed.addFields({
          name: `${StatusIcons.PROTECTED} Protected Until`,
          value: formatTimestamp(teamTournament.protectedUntil, 'R'),
          inline: false,
        });
      } else {
        embed.addFields({
          name: 'Status',
          value: `${StatusIcons.UNLOCKED} Challengeable`,
          inline: false,
        });
      }

      // Get pending challenges
      if (teamTournament._id) {
        const challengeService = new ChallengeService();
        const pendingChallenges = await challengeService.getPendingChallenges(
          teamTournament._id.toString(),
        );

        if (pendingChallenges.length > 0) {
          const challengesList = pendingChallenges
            .map(challenge => {
              const isChallenger =
                challenge.challengerTeamTournament.toString() === teamTournament._id.toString();
              const otherTeam = isChallenger
                ? challenge.defendingTeamTournament.team?.name || 'Unknown Team'
                : challenge.challengerTeamTournament.team?.name || 'Unknown Team';
              const statusIcon = getChallengeStatusIcon(challenge.status);

              return `• **Challenge ID:** ${challenge.challengeId}\n  ${isChallenger ? `${StatusIcons.UP} Challenging` : `${StatusIcons.DOWN} Challenged by`} **${otherTeam}**\n  Status: ${statusIcon} ${challenge.status}`;
            })
            .join('\n\n');

          embed.addFields({
            name: '⚔️ Pending Challenges',
            value: challengesList,
            inline: false,
          });
        }
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error viewing team:', error as Error);
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Failed to Retrieve Team Details',
          'An error occurred while retrieving the team details.',
          'Please try again later or contact an administrator if the problem persists.',
        ),
      ],
    });
  }
}
