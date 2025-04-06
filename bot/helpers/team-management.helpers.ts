import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.utils';
import { TournamentService } from '../services/tournament/tournament.services';
import { ChallengeService } from '../services/tournament/challenge.services';
import { Role } from '../database/enums/role.enums';
import { ITeam, ITeamMember } from '../database/models/team.model';
import { ITeamTournament } from '../database/models/team-tournament.model';
import { Team } from '../database/models';
import { IChallenge } from '../database/models/challenge.model';

const tournamentService = new TournamentService();
const challengeService = new ChallengeService();

/**
 * Check if a user is already a team captain
 */
export const isAlreadyCaptain = async (userId: string): Promise<boolean> => {
  const teams = await Team.find({ captain: userId });
  return teams.length > 0;
};

/**
 * Send team created embed
 */
export const sendTeamCreatedEmbed = async (
  interaction: ChatInputCommandInteraction,
  team: ITeam,
): Promise<void> => {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Team Created')
    .setDescription(`Your team **${team.name}** has been created successfully!`)
    .addFields(
      { name: 'Team ID', value: team.teamId, inline: false },
      { name: 'Captain', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Starting Tier', value: '5', inline: true },
      { name: 'Next Steps', value: 'Use `/team add_member` to add players to your team!' },
    )
    .setTimestamp()
    .setFooter({ text: 'Twinspire Bot' });

  await interaction.editReply({ embeds: [embed] });
};

/**
 * Find a team by name or user membership
 */
export const findTeam = async (
  teamName: string | null,
  userId: string,
  tournamentId: string,
): Promise<ITeam | null> => {
  const teamTournaments = await tournamentService.getTournamentStandings(tournamentId);
  const teams = await Team.find({ _id: { $in: teamTournaments.map(t => t.team) } });

  if (!teamName) {
    // Find team user is part of
    return (
      teams.find(t => t.captainId === userId || t.members.some(m => m.discordId === userId)) || null
    );
  } else {
    // Find team by name
    return teams.find(t => t.name.toLowerCase() === teamName.toLowerCase()) || null;
  }
};

/**
 * Get team tier position
 */
export const getTierPosition = (tierTeams: ITeamTournament[], teamId: string): number => {
  return (
    tierTeams.sort((a, b) => b.prestige - a.prestige).findIndex(t => t.team.toString() === teamId) +
    1
  );
};

/**
 * Create team info embed
 */
export const createTeamInfoEmbed = (
  team: ITeam,
  tierPosition: number,
  totalTeamsInTier: number,
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Team ${team.name}`)
    .setDescription(`Ranked #${tierPosition} out of ${totalTeamsInTier} teams in tier`);

  return embed;
};

/**
 * Format members list with roles for display
 */
export const formatMembersList = (members: ITeamMember[]): string => {
  const membersByRole = new Map<Role, ITeamMember[]>();
  const unassignedMembers: ITeamMember[] = [];

  // Group members by role
  members.forEach(member => {
    if (member.role && Object.values(Role).includes(member.role as Role)) {
      if (!membersByRole.has(member.role as Role)) {
        membersByRole.set(member.role as Role, []);
      }
      membersByRole.get(member.role as Role)?.push(member);
    } else {
      unassignedMembers.push(member);
    }
  });

  // Build members list text by role
  let membersListText = Array.from(membersByRole.entries())
    .map(([role, roleMembers]) => {
      const roleIcon = getRoleIcon(role);
      const membersText = roleMembers
        .map(m => `• <@${m.discordId}>${m.isCaptain ? ' (Captain)' : ''}`)
        .join('\n');
      return `${roleIcon} **${role}**\n${membersText}`;
    })
    .join('\n\n');

  // Add unassigned members if any
  if (unassignedMembers.length > 0) {
    const unassignedList = unassignedMembers
      .map(m => `• <@${m.discordId}>${m.isCaptain ? ' (Captain)' : ''}`)
      .join('\n');
    membersListText += `\n\n❓ **Unassigned**\n${unassignedList}`;
  }

  return membersListText;
};

/**
 * Get icon for role
 */
export const getRoleIcon = (role: Role): string => {
  const roleIcons: Record<Role, string> = {
    [Role.TOP]: '⚔️',
    [Role.JUNGLE]: '🌳',
    [Role.MID]: '🎯',
    [Role.ADC]: '🏹',
    [Role.SUPPORT]: '🛡️',
    [Role.FILL]: '🔄',
  };
  return roleIcons[role] || '❓';
};

/**
 * Add protection status to team embed
 */
export const addProtectionStatus = (embed: EmbedBuilder, teamTournament: ITeamTournament): void => {
  if (teamTournament.protectedUntil && teamTournament.protectedUntil > new Date()) {
    embed.addFields({
      name: 'Protection Status',
      value: `Protected until ${teamTournament.protectedUntil.toLocaleDateString()}`,
    });
  }
};

/**
 * Add pending challenges to team embed
 */
export const addPendingChallenges = async (
  embed: EmbedBuilder,
  teamTournament: ITeamTournament,
): Promise<void> => {
  const pendingChallenges = await challengeService.getPendingChallenges(
    teamTournament._id.toString(),
  );
  if (pendingChallenges.length > 0) {
    embed.addFields({
      name: 'Pending Challenges',
      value: pendingChallenges
        .map(
          (challenge: IChallenge) =>
            `vs ${challenge.defendingTeamTournament.team.name} (${challenge.status})`,
        )
        .join('\n'),
    });
  }
};

/**
 * Get team where user is captain
 */
export const getTeamAsCaptain = async (userId: string): Promise<ITeam | null> => {
  return await Team.findOne({
    members: {
      $elemMatch: {
        discordId: userId,
        isCaptain: true,
      },
    },
  });
};

/**
 * Check if user is already in the team
 */
export const isUserAlreadyTeamMember = (team: ITeam, userId: string): boolean => {
  return team.members.some(member => member.discordId === userId);
};

/**
 * Check if user is in another team
 */
export const isUserInAnotherTeam = async (
  userId: string,
  currentTeamId: string,
): Promise<boolean> => {
  const team = await Team.findOne({
    teamId: { $ne: currentTeamId },
    members: {
      $elemMatch: {
        discordId: userId,
      },
    },
  });

  return team !== null;
};

/**
 * Validate and parse role
 */
export const validateRole = (roleStr: string | null): Role | undefined => {
  if (!roleStr) return undefined;

  if (!Object.values(Role).includes(roleStr as Role)) {
    throw new Error(`Invalid role: ${roleStr}`);
  }

  return roleStr as Role;
};

/**
 * Handle command errors
 */
export const handleCommandError = (
  interaction: ChatInputCommandInteraction,
  action: string,
  error: unknown,
): void => {
  logger.error(`Error ${action}:`, error instanceof Error ? error : new Error(String(error)));
  interaction
    .editReply(`Failed ${action}. Please try again later.`)
    .catch(e => logger.error(`Error sending error reply:`, e));
};
