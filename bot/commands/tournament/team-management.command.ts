import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { TeamService } from '../../services/tournament/team.services';
import { TournamentService } from '../../services/tournament/tournament.services';
import { Role } from '../../database/enums/role.enums';
import {
  addPendingChallenges,
  addProtectionStatus,
  createTeamInfoEmbed,
  getTeamAsCaptain,
  getTierPosition,
  handleCommandError,
  isAlreadyCaptain,
  isUserAlreadyTeamMember,
  isUserInAnotherTeam,
  sendTeamCreatedEmbed,
  validateRole,
} from '../../helpers/team-management.helpers';
import { ITeamMember } from '../../database/models/team.model';

// Service instances
const teamService = new TeamService();
const tournamentService = new TournamentService();

/**
 * Handle the team create command
 * @param interaction Discord interaction object
 */
export async function handleCreateTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const name = interaction.options.getString('name', true);
    const captainId = interaction.user.id;
    const captainUsername = interaction.user.username;

    // Validate the user can create a team
    if (await isAlreadyCaptain(captainId)) {
      await interaction.editReply(
        `You are already the captain of another team. You cannot create another team.`,
      );
      return;
    }

    // Create the team
    const newMember: ITeamMember = {
      discordId: captainId,
      username: captainUsername,
      role: Role.TOP,
      isCaptain: true,
    };

    const team = await teamService.createTeam({
      name,
      captainId,
      members: [newMember],
      tournaments: [],
    });

    await sendTeamCreatedEmbed(interaction, team);
  } catch (error) {
    handleCommandError(interaction, 'creating team', error);
  }
}

/**
 * Handle the team view command
 * @param interaction Discord interaction object
 */
export async function handleViewTeam(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const teamName = interaction.options.getString('team_name');
    const userId = interaction.user.id;

    if (!teamName) {
      await interaction.editReply('You must provide a team name to view a team.');
      return;
    }

    // Find team
    const team = await teamService.getTeamByTeamName(teamName);

    if (!team) {
      await interaction.editReply(`Team "${teamName}" not found.`);
      return;
    }

    const isMember = team.members.some(member => member.discordId === userId);

    if (!isMember) {
      await interaction.editReply(`You are not a member of team "${teamName}".`);
      return;
    }

    // Get all active tournaments for the team
    const activeTournaments = await tournamentService.getActiveTournaments();
    const teamTournaments = await Promise.all(
      activeTournaments.map(async tournament => {
        const stats = await tournamentService.getTeamTournamentStats(
          team.teamId,
          tournament.tournamentId,
        );
        return { tournament, stats };
      }),
    );

    // Filter out tournaments where the team is not participating
    const activeTeamTournaments = teamTournaments.filter(({ stats }) => stats !== null);

    if (activeTeamTournaments.length === 0) {
      await interaction.editReply(
        `Team "${teamName}" is not participating in any active tournaments.`,
      );
      return;
    }

    // Create embeds for each tournament
    const embeds = await Promise.all(
      activeTeamTournaments.map(async ({ tournament, stats }) => {
        if (!stats) return null;

        // Get tier position
        const tournamentTeams = await tournamentService.getTournamentStandings(
          tournament.tournamentId,
        );
        const tierPosition = getTierPosition(tournamentTeams, team.teamId);

        // Create team info embed
        const embed = createTeamInfoEmbed(team, tierPosition, tournamentTeams.length);

        // Add tournament-specific information
        embed.setTitle(`Team ${team.name} - ${tournament.name}`);
        embed.addFields(
          { name: 'Tournament', value: tournament.name, inline: true },
          { name: 'Tier', value: stats.tier.toString(), inline: true },
          { name: 'Prestige', value: stats.prestige.toString(), inline: true },
          { name: 'Record', value: `${stats.wins}-${stats.losses}`, inline: true },
          { name: 'Win Streak', value: stats.winStreak.toString(), inline: true },
        );

        // Add protection status
        addProtectionStatus(embed, stats);

        // Add pending challenges
        await addPendingChallenges(embed, stats);

        return embed;
      }),
    );

    // Filter out any null embeds and send the results
    const validEmbeds = embeds.filter((embed): embed is EmbedBuilder => embed !== null);
    await interaction.editReply({ embeds: validEmbeds });
  } catch (error) {
    handleCommandError(interaction, 'viewing team', error);
  }
}

/**
 * Handle the team add_member command
 * @param interaction Discord interaction object
 */
export async function handleAddMember(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const user = interaction.options.getUser('user', true);
    const roleStr = interaction.options.getString('role');
    const captainId = interaction.user.id;

    // Validate role if provided
    const role = validateRole(roleStr);

    // Check if user is captain
    const captainTeam = await getTeamAsCaptain(captainId);
    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can add members.',
      );
      return;
    }

    // Validate the user can be added
    if (isUserAlreadyTeamMember(captainTeam, user.id)) {
      await interaction.editReply(`<@${user.id}> is already a member of your team.`);
      return;
    }

    // Check if user is in another team
    if (await isUserInAnotherTeam(user.id, captainTeam.teamId)) {
      await interaction.editReply(
        `<@${user.id}> is already a member of another team. They must leave that team first.`,
      );
      return;
    }

    // Add the member
    const newMember: ITeamMember = {
      discordId: user.id,
      username: user.username,
      role,
      isCaptain: false,
    };

    const success = await teamService.addTeamMember(captainTeam.teamId, newMember);

    if (success) {
      await interaction.editReply(
        `Successfully added <@${user.id}> to team **${captainTeam.name}**${role ? ` as ${role}` : ''}.`,
      );
    } else {
      await interaction.editReply(`Failed to add <@${user.id}> to team.`);
    }
  } catch (error) {
    handleCommandError(interaction, 'adding team member', error);
  }
}

/**
 * Handle the team remove_member command
 * @param interaction Discord interaction object
 */
export async function handleRemoveMember(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const user = interaction.options.getUser('user', true);
    const captainId = interaction.user.id;

    // Check if user is captain
    const captainTeam = await getTeamAsCaptain(captainId);
    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can remove members.',
      );
      return;
    }

    // Cannot remove yourself as captain
    if (user.id === captainId) {
      await interaction.editReply(
        'You cannot remove yourself from the team as you are the captain.',
      );
      return;
    }

    // Check if user is in the team
    if (!isUserAlreadyTeamMember(captainTeam, user.id)) {
      await interaction.editReply(`<@${user.id}> is not a member of your team.`);
      return;
    }

    // Remove the member
    const success = await teamService.removeTeamMember(captainTeam.teamId, user.id);

    if (success) {
      await interaction.editReply(
        `Successfully removed <@${user.id}> from team **${captainTeam.name}**.`,
      );
    } else {
      await interaction.editReply(`Failed to remove <@${user.id}> from team.`);
    }
  } catch (error) {
    handleCommandError(interaction, 'removing team member', error);
  }
}

/**
 * Handle the team update_member command
 * @param interaction Discord interaction object
 */
export async function handleUpdateMember(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const user = interaction.options.getUser('user', true);
    const roleStr = interaction.options.getString('role', true).toUpperCase();
    const captainId = interaction.user.id;

    // Validate role
    if (!Object.values(Role).includes(roleStr as Role)) {
      await interaction.editReply(
        `Invalid role. Please choose one of: ${Object.values(Role).join(', ')}`,
      );
      return;
    }
    const role = roleStr as Role;

    // Check if user is captain
    const captainTeam = await getTeamAsCaptain(captainId);
    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can update member roles.',
      );
      return;
    }

    // Check if user is in the team
    if (!isUserAlreadyTeamMember(captainTeam, user.id)) {
      await interaction.editReply(`<@${user.id}> is not a member of your team.`);
      return;
    }

    // Update the member's role
    const success = await teamService.updateTeamMemberRole(captainTeam.teamId, user.id, role);

    if (success) {
      await interaction.editReply(
        `Successfully updated <@${user.id}>'s role to **${role}** in team **${captainTeam.name}**.`,
      );
    } else {
      await interaction.editReply(`Failed to update <@${user.id}>'s role.`);
    }
  } catch (error) {
    handleCommandError(interaction, 'updating team member', error);
  }
}

/**
 * Handle the team transfer_captain command
 * @param interaction Discord interaction object
 */
export async function handleTransferCaptain(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const newCaptain = interaction.options.getUser('user', true);
    const captainId = interaction.user.id;

    // Check if user is captain
    const captainTeam = await getTeamAsCaptain(captainId);
    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can transfer the captain role.',
      );
      return;
    }

    // Cannot transfer to yourself
    if (newCaptain.id === captainId) {
      await interaction.editReply('You cannot transfer the captain role to yourself.');
      return;
    }

    // Check if user is in the team
    if (!isUserAlreadyTeamMember(captainTeam, newCaptain.id)) {
      await interaction.editReply(`<@${newCaptain.id}> is not a member of your team.`);
      return;
    }

    // Transfer the captain role
    const success = await teamService.transferCaptainRole(captainTeam.teamId, newCaptain.id);

    if (success) {
      await interaction.editReply(
        `Successfully transferred captain role to <@${newCaptain.id}> in team **${captainTeam.name}**.`,
      );
    } else {
      await interaction.editReply(`Failed to transfer captain role to <@${newCaptain.id}>.`);
    }
  } catch (error) {
    handleCommandError(interaction, 'transferring captain role', error);
  }
}

/**
 * Handle the team add_to_tournament command
 * @param interaction Discord interaction object
 */
export async function handleAddTeamToTournament(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id', true);
    const tournamentId = interaction.options.getString('tournament_id', true);
    const captainId = interaction.user.id;

    // Check if user is captain
    const captainTeam = await getTeamAsCaptain(captainId);
    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can add teams to tournaments.',
      );
      return;
    }

    // Check if team belongs to captain
    if (captainTeam.teamId !== teamId) {
      await interaction.editReply(
        'You can only add your own team to tournaments. Please provide your team ID.',
      );
      return;
    }

    // Add team to tournament
    const success = await teamService.addTeamToTournament(teamId, tournamentId);

    if (success) {
      const tournament = await tournamentService.getTournamentById(tournamentId);

      if (!tournament) {
        await interaction.editReply(
          `Successfully added team **${captainTeam.name}** to tournament ${tournamentId}.`,
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Team Added to Tournament')
        .setDescription(
          `Your team **${captainTeam.name}** has been added to tournament **${tournament.name}**!`,
        )
        .addFields(
          { name: 'Team ID', value: teamId, inline: true },
          { name: 'Tournament ID', value: tournamentId, inline: true },
          { name: 'Starting Tier', value: '5', inline: true },
          {
            name: 'Next Steps',
            value: "Use `/team view_tournament` to see your team's tournament stats!",
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Twinspire Bot' });

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply(
        'Failed to add team to tournament. The team may already be in this tournament or the tournament may not exist.',
      );
    }
  } catch (error) {
    handleCommandError(interaction, 'adding team to tournament', error);
  }
}

/**
 * Handle the team remove_from_tournament command
 * @param interaction Discord interaction object
 */
export async function handleRemoveTeamFromTournament(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id', true);
    const tournamentId = interaction.options.getString('tournament_id', true);
    const captainId = interaction.user.id;

    // Check if user is captain
    const captainTeam = await getTeamAsCaptain(captainId);
    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can remove teams from tournaments.',
      );
      return;
    }

    // Check if team belongs to captain
    if (captainTeam.teamId !== teamId) {
      await interaction.editReply(
        'You can only remove your own team from tournaments. Please provide your team ID.',
      );
      return;
    }

    // Get tournament stats before removing
    const tournamentStats = await tournamentService.getTeamTournamentStats(teamId, tournamentId);
    if (!tournamentStats) {
      await interaction.editReply('Your team is not in this tournament.');
      return;
    }

    // Remove team from tournament
    const success = await teamService.removeTeamFromTournament(teamId, tournamentId);

    if (success) {
      const tournament = await tournamentService.getTournamentById(tournamentId);

      if (!tournament) {
        await interaction.editReply(
          `Successfully removed team **${captainTeam.name}** from tournament ${tournamentId}.`,
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Team Removed from Tournament')
        .setDescription(
          `Your team **${captainTeam.name}** has been removed from tournament **${tournament.name}**`,
        )
        .addFields(
          { name: 'Team ID', value: teamId, inline: true },
          { name: 'Tournament ID', value: tournamentId, inline: true },
          {
            name: 'Final Stats',
            value: `Wins: ${tournamentStats.wins}, Losses: ${tournamentStats.losses}, Prestige: ${tournamentStats.prestige}`,
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: 'Twinspire Bot' });

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply(
        'Failed to remove team from tournament. The team may not be in this tournament or the tournament may not exist.',
      );
    }
  } catch (error) {
    handleCommandError(interaction, 'removing team from tournament', error);
  }
}
