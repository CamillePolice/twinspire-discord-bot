// src/commands/team-management.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { TournamentService } from '../../services/tournament/tournamentService';
import { logger } from '../../utils/logger';
import { Team, TeamMember } from '../../database/models/tournament';

const tournamentService = new TournamentService();

/**
 * Handle the team create command
 */
export async function handleCreateTeam(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const name = interaction.options.getString('name', true);
    const captainId = interaction.user.id;
    const captainUsername = interaction.user.username;

    // Check if this user is already a captain of a team
    const teams = await tournamentService.getTournamentStandings();
    const existingTeam = teams.find(team => team.captainId === captainId);

    if (existingTeam) {
      await interaction.editReply(
        `You are already the captain of team **${existingTeam.name}** (ID: ${existingTeam.teamId}). You cannot create another team.`,
      );
      return;
    }

    // Create the team
    const team = await tournamentService.createTeam({
      name,
      captainId,
      members: [
        {
          discordId: captainId,
          username: captainUsername,
          role: 'Captain',
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Team Created')
      .setDescription(`Your team **${name}** has been created successfully!`)
      .addFields(
        { name: 'Team ID', value: team.teamId, inline: false },
        { name: 'Captain', value: `<@${captainId}>`, inline: true },
        { name: 'Starting Tier', value: team.tier.toString(), inline: true },
        { name: 'Next Steps', value: 'Use `/team add_member` to add players to your team!' },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error creating team:', error as Error);
    await interaction.editReply('Failed to create team. Check logs for details.');
  }
}

/**
 * Handle the team view command
 */
export async function handleViewTeam(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id');

    // If no team ID is provided, try to find a team that includes the user
    let team: Team | null = null;

    if (!teamId) {
      const teams = await tournamentService.getTournamentStandings();
      team =
        teams.find(
          t =>
            t.captainId === interaction.user.id ||
            t.members.some((m: TeamMember) => m.discordId === interaction.user.id),
        ) || null;

      if (!team) {
        await interaction.editReply(
          'You are not a member of any team. Please provide a team ID or join a team first.',
        );
        return;
      }
    } else {
      team = await tournamentService.getTeamById(teamId);
      if (!team) {
        await interaction.editReply(`Team with ID ${teamId} not found.`);
        return;
      }
    }

    // Create members list
    const membersList = team.members
      .map((member: any) => {
        const roleText = member.role ? ` (${member.role})` : '';
        return `• <@${member.discordId}>${roleText}`;
      })
      .join('\n');

    // Get team's tier info
    const tierTeams = await tournamentService.getTeamsByTier(team.tier);
    const tierPosition =
      tierTeams.sort((a, b) => b.prestige - a.prestige).findIndex(t => t.teamId === team!.teamId) +
      1;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Team: ${team.name}`)
      .addFields(
        { name: 'Team ID', value: team.teamId, inline: false },
        { name: 'Captain', value: `<@${team.captainId}>`, inline: true },
        { name: 'Members', value: membersList || 'No members', inline: false },
        { name: 'Tier', value: team.tier.toString(), inline: true },
        { name: 'Tier Position', value: `${tierPosition}/${tierTeams.length}`, inline: true },
        { name: 'Prestige', value: team.prestige.toString(), inline: true },
        { name: 'Record', value: `${team.wins}-${team.losses}`, inline: true },
        { name: 'Win Streak', value: team.winStreak.toString(), inline: true },
        {
          name: 'Created',
          value: `<t:${Math.floor(team.createdAt.getTime() / 1000)}:R>`,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    // Add protection status if applicable
    if (team.protectedUntil && team.protectedUntil > new Date()) {
      embed.addFields({
        name: 'Protected Until',
        value: `<t:${Math.floor(team.protectedUntil.getTime() / 1000)}:R>`,
        inline: false,
      });
    } else {
      embed.addFields({
        name: 'Status',
        value: 'Challengeable',
        inline: false,
      });
    }

    // Get pending challenges
    const pendingChallenges = await tournamentService.getPendingChallengesForTeam(team.teamId);

    if (pendingChallenges.length > 0) {
      const challengesList = pendingChallenges
        .map(challenge => {
          const isChallenger = challenge.challengerTeamId === team!.teamId;
          const otherTeamId = isChallenger ? challenge.defendingTeamId : challenge.challengerTeamId;

          return `• Challenge ID: ${challenge.challengeId}\n  ${isChallenger ? 'Challenging' : 'Challenged by'} team ${otherTeamId}\n  Status: ${challenge.status}`;
        })
        .join('\n\n');

      embed.addFields({
        name: 'Pending Challenges',
        value: challengesList,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error viewing team:', error as Error);
    await interaction.editReply('Failed to retrieve team details. Check logs for details.');
  }
}

/**
 * Handle the team add_member command
 */
export async function handleAddMember(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const user = interaction.options.getUser('user', true);
    const role = interaction.options.getString('role');

    // Check if the command user is a team captain
    const teams = await tournamentService.getTournamentStandings();
    const captainTeam = teams.find(team => team.captainId === interaction.user.id);

    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can add members.',
      );
      return;
    }

    // Check if the user is already in this team
    const isAlreadyMember = captainTeam.members.some(member => member.discordId === user.id);
    if (isAlreadyMember) {
      await interaction.editReply(`<@${user.id}> is already a member of your team.`);
      return;
    }

    // Check if the user is in another team
    const otherTeam = teams.find(
      team =>
        team.teamId !== captainTeam.teamId &&
        team.members.some(member => member.discordId === user.id),
    );

    if (otherTeam) {
      await interaction.editReply(
        `<@${user.id}> is already a member of team **${otherTeam.name}**. They must leave that team first.`,
      );
      return;
    }

    // Add the member to the team
    const member: TeamMember = {
      discordId: user.id,
      username: user.username,
      role: role || undefined,
    };

    const success = await tournamentService.addTeamMember(captainTeam.teamId, member);

    if (success) {
      await interaction.editReply(
        `Successfully added <@${user.id}> to team **${captainTeam.name}**${role ? ` as ${role}` : ''}.`,
      );
    } else {
      await interaction.editReply(`Failed to add <@${user.id}> to team.`);
    }
  } catch (error) {
    logger.error('Error adding team member:', error as Error);
    await interaction.editReply('Failed to add team member. Check logs for details.');
  }
}

/**
 * Handle the team remove_member command
 */
export async function handleRemoveMember(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const user = interaction.options.getUser('user', true);

    // Check if the command user is a team captain
    const teams = await tournamentService.getTournamentStandings();
    const captainTeam = teams.find(team => team.captainId === interaction.user.id);

    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can remove members.',
      );
      return;
    }

    // Cannot remove the captain (yourself)
    if (user.id === interaction.user.id) {
      await interaction.editReply(
        'You cannot remove yourself from the team as you are the captain.',
      );
      return;
    }

    // Check if the user is in this team
    const isMember = captainTeam.members.some(member => member.discordId === user.id);
    if (!isMember) {
      await interaction.editReply(`<@${user.id}> is not a member of your team.`);
      return;
    }

    // Remove the member from the team
    const success = await tournamentService.removeTeamMember(captainTeam.teamId, user.id);

    if (success) {
      await interaction.editReply(
        `Successfully removed <@${user.id}> from team **${captainTeam.name}**.`,
      );
    } else {
      await interaction.editReply(`Failed to remove <@${user.id}> from team.`);
    }
  } catch (error) {
    logger.error('Error removing team member:', error as Error);
    await interaction.editReply('Failed to remove team member. Check logs for details.');
  }
}

/**
 * Handle the team update_member command
 */
export async function handleUpdateMember(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const user = interaction.options.getUser('user', true);
    const role = interaction.options.getString('role', true);

    // Check if the command user is a team captain
    const teams = await tournamentService.getTournamentStandings();
    const captainTeam = teams.find(team => team.captainId === interaction.user.id);

    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can update member roles.',
      );
      return;
    }

    // Check if the user is in this team
    const isMember = captainTeam.members.some(member => member.discordId === user.id);
    if (!isMember) {
      await interaction.editReply(`<@${user.id}> is not a member of your team.`);
      return;
    }

    // Cannot update the captain's role
    if (user.id === interaction.user.id) {
      await interaction.editReply(
        'You cannot update your own role as you are the captain.',
      );
      return;
    }

    // Update the member's role
    const success = await tournamentService.updateTeamMemberRole(captainTeam.teamId, user.id, role);

    if (success) {
      await interaction.editReply(
        `Successfully updated <@${user.id}>'s role to **${role}** in team **${captainTeam.name}**.`,
      );
    } else {
      await interaction.editReply(`Failed to update <@${user.id}>'s role.`);
    }
  } catch (error) {
    logger.error('Error updating team member:', error as Error);
    await interaction.editReply('Failed to update team member. Check logs for details.');
  }
}
