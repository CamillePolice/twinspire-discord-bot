// src/commands/team-management.ts
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { TournamentService } from '../../services/tournament/tournament.services';
import { logger } from '../../utils/logger.utils';
import { Team, TeamMember, Role } from '../../database/models/tournament.model';

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
          role: Role.TOP,
          isCaptain: true,
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
    const teamName = interaction.options.getString('team_name');

    // If no team name is provided, try to find a team that includes the user
    let team: Team | null = null;

    if (!teamName) {
      const teams = await tournamentService.getTournamentStandings();
      team =
        teams.find(
          t =>
            t.captainId === interaction.user.id ||
            t.members.some(m => m.discordId === interaction.user.id),
        ) || null;

      if (!team) {
        await interaction.editReply(
          'You are not a member of any team. Please provide a team name or join a team first.',
        );
        return;
      }
    } else {
      const teams = await tournamentService.getTournamentStandings();
      team = teams.find(t => t.name.toLowerCase() === teamName.toLowerCase()) || null;

      if (!team) {
        await interaction.editReply(`Team "${teamName}" not found.`);
        return;
      }
    }

    // Create members list grouped by role
    const membersByRole = new Map<Role, TeamMember[]>();
    const unassignedMembers: TeamMember[] = [];

    team.members.forEach(member => {
      if (member.role && Object.values(Role).includes(member.role)) {
        if (!membersByRole.has(member.role)) {
          membersByRole.set(member.role, []);
        }
        membersByRole.get(member.role)?.push(member);
      } else {
        unassignedMembers.push(member);
      }
    });

    // Build members list text
    let membersListText = Array.from(membersByRole.entries())
      .map(([role, members]) => {
        const roleMembers = members.map(member => {
          return `• <@${member.discordId}>${member.isCaptain ? ' (Captain)' : ''}`;
        }).join('\n');
        const roleIcon = {
          [Role.TOP]: '⚔️',
          [Role.JUNGLE]: '🌳',
          [Role.MID]: '🎯',
          [Role.ADC]: '🏹',
          [Role.SUPPORT]: '🛡️',
          [Role.FILL]: '🔄',
        }[role];
        return `${roleIcon} **${role}**\n${roleMembers}`;
      })
      .join('\n\n');

    if (unassignedMembers.length > 0) {
      const unassignedList = unassignedMembers.map(member => {
        return `• <@${member.discordId}>${member.isCaptain ? ' (Captain)' : ''}`;
      }).join('\n');
      membersListText += `\n\n❓ **Unassigned**\n${unassignedList}`;
    }

    // Get team's tier info
    const tierTeams = await tournamentService.getTeamsByTier(team.tier);
    const tierPosition =
      tierTeams.sort((a, b) => b.prestige - a.prestige).findIndex(t => t.teamId === team!.teamId) + 1;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Team: ${team.name}`)
      .addFields(
        { name: 'Team ID', value: team.teamId, inline: false },
        { name: '👑 Captain', value: `<@${team.captainId}>`, inline: true },
        { name: 'Members', value: membersListText || 'No members', inline: false },
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
    const roleStr = interaction.options.getString('role');

    // Validate role if provided
    let role: Role | undefined;
    if (roleStr) {
      if (!Object.values(Role).includes(roleStr as Role)) {
        await interaction.editReply(
          `Invalid role. Please choose one of: ${Object.values(Role).join(', ')}`,
        );
        return;
      }
      role = roleStr as Role;
    }

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
      role,
      isCaptain: false,
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
    const roleStr = interaction.options.getString('role', true).toUpperCase();

    // Validate role
    if (!Object.values(Role).includes(roleStr as Role)) {
      await interaction.editReply(
        `Invalid role. Please choose one of: ${Object.values(Role).join(', ')}`,
      );
      return;
    }
    const role = roleStr as Role;

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

/**
 * Handle the team transfer_captain command
 */
export async function handleTransferCaptain(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const newCaptain = interaction.options.getUser('user', true);

    // Check if the command user is a team captain
    const teams = await tournamentService.getTournamentStandings();
    const captainTeam = teams.find(team => team.captainId === interaction.user.id);

    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can transfer the captain role.',
      );
      return;
    }

    // Cannot transfer captain role to yourself
    if (newCaptain.id === interaction.user.id) {
      await interaction.editReply('You cannot transfer the captain role to yourself.');
      return;
    }

    // Check if the user is in this team
    const isMember = captainTeam.members.some(member => member.discordId === newCaptain.id);
    if (!isMember) {
      await interaction.editReply(`<@${newCaptain.id}> is not a member of your team.`);
      return;
    }

    // Transfer the captain role
    const success = await tournamentService.transferCaptainRole(captainTeam.teamId, newCaptain.id);

    if (success) {
      await interaction.editReply(
        `Successfully transferred captain role to <@${newCaptain.id}> in team **${captainTeam.name}**.`,
      );
    } else {
      await interaction.editReply(`Failed to transfer captain role to <@${newCaptain.id}>.`);
    }
  } catch (error) {
    logger.error('Error transferring captain role:', error as Error);
    await interaction.editReply('Failed to transfer captain role. Check logs for details.');
  }
}

/**
 * Handle the team add_to_tournament command
 */
export async function handleAddTeamToTournament(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id', true);
    const tournamentId = interaction.options.getString('tournament_id', true);

    // Check if the command user is a team captain
    const teams = await tournamentService.getTournamentStandings();
    const captainTeam = teams.find(team => team.captainId === interaction.user.id);

    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can add teams to tournaments.',
      );
      return;
    }

    // Check if the team ID matches the captain's team
    if (captainTeam.teamId !== teamId) {
      await interaction.editReply(
        'You can only add your own team to tournaments. Please provide your team ID.',
      );
      return;
    }

    // Add team to tournament
    const success = await tournamentService.addTeamToTournament(teamId, tournamentId);

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
        .setDescription(`Your team **${captainTeam.name}** has been added to tournament **${tournament.name}**!`)
        .addFields(
          { name: 'Team ID', value: teamId, inline: true },
          { name: 'Tournament ID', value: tournamentId, inline: true },
          { name: 'Starting Tier', value: '5', inline: true },
          { name: 'Next Steps', value: 'Use `/team view_tournament` to see your team\'s tournament stats!' },
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
    logger.error('Error adding team to tournament:', error as Error);
    await interaction.editReply('Failed to add team to tournament. Check logs for details.');
  }
}

/**
 * Handle the team remove_from_tournament command
 */
export async function handleRemoveTeamFromTournament(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id', true);
    const tournamentId = interaction.options.getString('tournament_id', true);

    // Check if the command user is a team captain
    const teams = await tournamentService.getTournamentStandings();
    const captainTeam = teams.find(team => team.captainId === interaction.user.id);

    if (!captainTeam) {
      await interaction.editReply(
        'You are not a team captain. Only team captains can remove teams from tournaments.',
      );
      return;
    }

    // Check if the team ID matches the captain's team
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
    const success = await tournamentService.removeTeamFromTournament(teamId, tournamentId);

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
        .setDescription(`Your team **${captainTeam.name}** has been removed from tournament **${tournament.name}**`)
        .addFields(
          { name: 'Team ID', value: teamId, inline: true },
          { name: 'Tournament ID', value: tournamentId, inline: true },
          { name: 'Final Stats', value: `Wins: ${tournamentStats.wins}, Losses: ${tournamentStats.losses}, Prestige: ${tournamentStats.prestige}`, inline: false },
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
    logger.error('Error removing team from tournament:', error as Error);
    await interaction.editReply('Failed to remove team from tournament. Check logs for details.');
  }
}
