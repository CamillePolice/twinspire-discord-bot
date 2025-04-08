import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import Team from '../../../../database/models/team.model';
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
import { ITournament } from '../../../../database/models';

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
      }).populate({
        path: 'tournaments',
        select: 'tier prestige wins losses winStreak protectedUntil tournament',
        populate: {
          path: 'tournament',
          model: 'Tournament',
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
      team = await Team.findOne({ name: teamName }).populate({
        path: 'tournaments',
        select: 'tier prestige wins losses winStreak protectedUntil tournament',
        populate: {
          path: 'tournament',
          model: 'Tournament',
        },
      });

      if (!team) {
        await interaction.editReply({
          embeds: [createErrorEmbed('Team Not Found', `Team "${teamName}" not found.`)],
        });
        return;
      }
    }

    // Get the team data
    const teamData = team.toObject();

    // Create the team embed
    const embed = createTeamEmbed(teamData.name).addFields(
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

    // Create a more efficient formatter for members
    const membersList = formatMembersList(teamData.members);
    embed.addFields({ name: 'Members', value: membersList, inline: false });

    // Optimize OP.GG link generation
    const summonerNames = teamData.members
      .filter(member => member.opgg)
      .map(member => {
        const match = member.opgg?.match(/\/summoners\/euw\/([^/]+)/);
        return match ? match[1].replace(/-/g, '%23') : null;
      })
      .filter(Boolean);

    if (summonerNames.length) {
      const opggUrl = `https://www.op.gg/multisearch/euw?summoners=${encodeURIComponent(summonerNames.join(','))}`;
      embed.addFields({
        name: 'OP.GG Team Profile',
        value: `[View Team Stats](${opggUrl})`,
        inline: false,
      });
    }

    // Handle multiple tournaments
    if (teamData.tournaments && teamData.tournaments.length > 0) {
      const challengeService = new ChallengeService();

      for (const teamTournament of teamData.tournaments) {
        const tournament = teamTournament.tournament as unknown as ITournament;
        const tournamentStats = formatTournamentStats(
          teamTournament.tier,
          teamTournament.prestige,
          teamTournament.wins,
          teamTournament.losses,
          teamTournament.winStreak,
        );

        embed.addFields({
          name: `🏆 ${tournament.name}`,
          value: tournamentStats,
          inline: false,
        });

        // Add protection status if applicable
        if (teamTournament.protectedUntil && teamTournament.protectedUntil > new Date()) {
          embed.addFields({
            name: `${StatusIcons.PROTECTED} Protected Until`,
            value: formatTimestamp(teamTournament.protectedUntil, 'R'),
            inline: true,
          });
        } else {
          embed.addFields({
            name: 'Status',
            value: `${StatusIcons.UNLOCKED} Challengeable`,
            inline: true,
          });
        }

        // Get pending challenges for this tournament
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
