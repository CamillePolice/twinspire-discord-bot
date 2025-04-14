import {
  EmbedBuilder,
  Colors,
  User,
  GuildMember,
  HexColorString,
  ColorResolvable,
} from 'discord.js';
import { ChallengeStatus } from '../database/enums/challenge.enums';
import { Role } from '../database/enums/role.enums';

/**
 * Helper functions for creating consistent, beautiful messages across commands
 */

// Color theme for different message types
export const MessageColors = {
  SUCCESS: Colors.Green,
  ERROR: Colors.Red,
  WARNING: Colors.Yellow,
  INFO: Colors.Blue,
  NEUTRAL: Colors.Blurple,

  // Custom theme colors
  TEAM: '#0099ff' as HexColorString,
  CHALLENGE: '#ff9900' as HexColorString,
  TOURNAMENT: '#9900ff' as HexColorString,
  ADMIN: '#ff0066' as HexColorString,
};

// Status icons for different operations
export const StatusIcons = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  PROTECTED: '🛡️',
  LOCKED: '🔒',
  UNLOCKED: '🔓',
  CROWN: '👑',
  TIME: '⏱️',
  CALENDAR: '📅',
  TROPHY: '🏆',
  STAR: '⭐',
  UP: '⬆️',
  DOWN: '⬇️',
};

/**
 * Get an icon for a team role
 * @param role - The role to get an icon for
 * @returns An appropriate emoji for the role
 */
export function getRoleIcon(role: string): string {
  const roleIcons: Record<string, string> = {
    [Role.TOP]: '⚔️',
    [Role.JUNGLE]: '🌳',
    [Role.MID]: '🎯',
    [Role.ADC]: '🏹',
    [Role.SUPPORT]: '🛡️',
    [Role.FILL]: '🔄',
    [Role.COACH]: '📊',
    [Role.LITTLE_LEGEND]: '🌟',
    [Role.MANAGER]: '👥',
  };

  return roleIcons[role] || '❓';
}

/**
 * Get an icon for a challenge status
 * @param status - The challenge status
 * @returns An appropriate emoji for the status
 */
export function getChallengeStatusIcon(status: string): string {
  const statusIcons: Record<string, string> = {
    [ChallengeStatus.PENDING]: '⏳',
    [ChallengeStatus.SCHEDULED]: '📅',
    [ChallengeStatus.COMPLETED]: '✅',
    [ChallengeStatus.CANCELLED]: '❌',
    [ChallengeStatus.FORFEITED]: '🏳️',
  };

  return statusIcons[status.toLowerCase()] || '❓';
}

/**
 * Format a date using Discord's timestamp format
 * @param date - The date to format
 * @param format - The timestamp format (R=relative, F=full, D=date, T=time, d=short date)
 * @returns A formatted timestamp string for Discord
 */
export function formatTimestamp(date: Date, format: 'R' | 'F' | 'D' | 'T' | 'd' = 'F'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${format}>`;
}

/**
 * Create a standard success embed
 * @param title - The embed title
 * @param description - The embed description
 * @returns An EmbedBuilder configured for success messages
 */
export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(MessageColors.SUCCESS)
    .setTitle(`${StatusIcons.SUCCESS} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create a standard error embed
 * @param title - The embed title
 * @param description - The embed description
 * @param details - Optional additional details about the error
 * @returns An EmbedBuilder configured for error messages
 */
export function createErrorEmbed(
  title: string,
  description: string,
  details?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(MessageColors.ERROR)
    .setTitle(`${StatusIcons.ERROR} ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (details) {
    embed.addFields({ name: 'Details', value: details });
  }

  return embed;
}

/**
 * Create a standard warning embed
 * @param title - The embed title
 * @param description - The embed description
 * @returns An EmbedBuilder configured for warning messages
 */
export function createWarningEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(MessageColors.WARNING)
    .setTitle(`${StatusIcons.WARNING} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create a standard info embed
 * @param title - The embed title
 * @param description - The embed description
 * @returns An EmbedBuilder configured for info messages
 */
export function createInfoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(MessageColors.INFO)
    .setTitle(`${StatusIcons.INFO} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Create a team embed with standard styling
 * @param teamName - The name of the team
 * @param description - Optional description for the embed
 * @param color - Optional custom color (defaults to team color)
 * @returns An EmbedBuilder configured for team information
 */
export function createTeamEmbed(
  teamName: string,
  description?: string,
  color: ColorResolvable = MessageColors.TEAM,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🛡️ Team: ${teamName}`)
    .setTimestamp()
    .setFooter({ text: 'Twinspire Bot • Team Info' });

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

/**
 * Create a challenge embed with standard styling
 * @param challengeId - The ID of the challenge
 * @param status - The status of the challenge
 * @param description - Optional description for the embed
 * @returns An EmbedBuilder configured for challenge information
 */
export function createChallengeEmbed(
  challengeId: string,
  status: string,
  description?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(MessageColors.CHALLENGE)
    .setTitle(`⚔️ Challenge: ${challengeId}`)
    .setTimestamp()
    .setFooter({ text: `Status: ${status} ${getChallengeStatusIcon(status)}` });

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

/**
 * Create a tournament embed with standard styling
 * @param tournamentName - The name of the tournament
 * @param description - Optional description for the embed
 * @returns An EmbedBuilder configured for tournament information
 */
export function createTournamentEmbed(tournamentName: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(MessageColors.TOURNAMENT)
    .setTitle(`${StatusIcons.TROPHY} Tournament: ${tournamentName}`)
    .setTimestamp()
    .setFooter({ text: 'Twinspire Bot • Tournament Info' });

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

/**
 * Create an admin embed with standard styling
 * @param title - The title for the embed
 * @param description - Optional description for the embed
 * @returns An EmbedBuilder configured for admin commands
 */
export function createAdminEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(MessageColors.ADMIN)
    .setTitle(`${StatusIcons.CROWN} ${title}`)
    .setTimestamp()
    .setFooter({ text: 'Twinspire Bot • Admin' });

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

/**
 * Format a list of team members with roles
 * @param members - Array of team members with roles
 * @returns Formatted string with members grouped by role
 */
export function formatMembersList(
  members: Array<{
    discordId: string;
    username: string;
    isCaptain?: boolean;
    role?: string;
  }>,
): string {
  const roleSections = new Map<string, string[]>();
  const unassignedMembers: string[] = [];

  // Organize members by role
  members.forEach(member => {
    const memberText = `<@${member.discordId}>${member.isCaptain ? ` ${StatusIcons.CROWN}` : ''}`;

    if (member.role) {
      const roleName = member.role;
      if (!roleSections.has(roleName)) {
        roleSections.set(roleName, []);
      }
      roleSections.get(roleName)?.push(memberText);
    } else {
      unassignedMembers.push(memberText);
    }
  });

  // Build the formatted members list
  let membersList = '';

  // Add role-based sections
  const roleOrder: string[] = Object.values(Role);
  roleOrder.forEach(role => {
    const members = roleSections.get(role);
    if (members && members.length > 0) {
      const roleIcon = getRoleIcon(role);
      membersList += `${roleIcon} **${role}**\n${members.join('\n')}\n\n`;
    }
  });

  // Add unassigned members if any
  if (unassignedMembers.length > 0) {
    membersList += `❓ **Unassigned**\n${unassignedMembers.join('\n')}\n\n`;
  }

  return membersList || 'No members';
}

/**
 * Add a user's avatar to an embed if available
 * @param embed - The embed to add the avatar to
 * @param user - The user whose avatar to add
 * @returns The embed with avatar added if available
 */
export function addUserAvatar(embed: EmbedBuilder, user: User | GuildMember): EmbedBuilder {
  if (user.avatar || (user instanceof GuildMember && user.user.avatar)) {
    const avatarUser = user instanceof GuildMember ? user.user : user;
    embed.setThumbnail(avatarUser.displayAvatarURL({ size: 128 }));
  }
  return embed;
}

/**
 * Format tournament stats into a compact display string
 * @param tier - The team's tier
 * @param prestige - The team's prestige points
 * @param wins - Number of wins
 * @param losses - Number of losses
 * @param winStreak - Current win streak
 * @returns Formatted stats string
 */
export function formatTournamentStats(
  tier: number,
  prestige: number,
  wins: number,
  losses: number,
  winStreak: number,
): string {
  return `Tier: **${tier}** • Prestige: **${prestige}**\nRecord: **${wins}-${losses}** • Win Streak: **${winStreak}**`;
}
