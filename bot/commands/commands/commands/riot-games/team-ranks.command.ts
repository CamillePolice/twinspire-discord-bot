import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { RiotApiService } from '../../../../services/riot-games/riot-api.services';
import { TeamService } from '../../../../services/tournament/team.services';
import {
  createErrorEmbed,
  createTeamEmbed,
  getRoleIcon,
  StatusIcons,
  MessageColors,
} from '../../../../helpers/message.helpers';
import { RankColor } from '../../../../enums/rank-color.enums';
import {
  extractSummonerInfo,
  calculateTeamAverageElo,
  getRankIcon,
  getTierEloValue,
} from '../../../../helpers/riot.helpers';
import { RANK_PRIORITY } from '../../../../enums/rank-priority.enums';
import { ROLE_ORDER } from '../../../../enums/role-order.enums';

const teamService = new TeamService();
const riotApiService = new RiotApiService();

/**
 * Format member data into a formatted string for embed display
 */
function formatMember(member: any): string {
  const captainIcon = member.isCaptain ? StatusIcons.CROWN : '▫️';
  const rankIcon = getRankIcon(member.tier); // Using the helper from riot.helpers.ts
  return `${captainIcon} <@${member.discordId}>: **${member.summonerName}** ${rankIcon} *${member.rank}*`;
}

export async function handleTeamRanks(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const teamId = interaction.options.getString('team_id', true);

    // Get team data
    const team = await teamService.getTeamByTeamId(teamId);

    if (!team) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Team Not Found',
            `Team with ID \`${teamId}\` not found.`,
            'Please verify the team ID and try again.',
          ),
        ],
      });
      return;
    }

    // Create team embed with a clearer title
    const embed = createTeamEmbed(
      team.name,
      `${StatusIcons.INFO} Ranked information for **${team.name}**`,
    );

    // Process members in parallel for better performance
    const processedMembers = await Promise.all(
      team.members.map(async member => {
        // If no OP.GG link, mark as missing
        if (!member.opgg) {
          return {
            member,
            status: 'missing' as const,
          };
        }

        try {
          const summonerInfo = extractSummonerInfo(member.opgg);

          if (!summonerInfo) {
            logger.error(`Error extracting summoner info for ${member.opgg}`);
            return {
              member,
              status: 'error' as const,
            };
          }

          // Get summoner rank
          const rank = await riotApiService.getSummonerTier(
            summonerInfo.name,
            summonerInfo.tagLine,
          );
          const tier = rank.split(' ')[0];

          // Extract LP for detailed ELO calculation
          const rankParts = rank.split(' ');
          const division = rankParts.length > 1 ? rankParts[1] : undefined;
          const lp = rankParts.length > 3 ? parseInt(rankParts[2], 10) : 0;

          // Calculate exact ELO value for this player
          const eloValue = getTierEloValue(tier, division, lp);

          return {
            member,
            status: 'success' as const,
            rankData: {
              discordId: member.discordId,
              summonerName: summonerInfo.name,
              rank,
              tier,
              division,
              lp,
              eloValue,
              role: member.role,
              isCaptain: member.isCaptain,
            },
          };
        } catch (error) {
          logger.error(`Error fetching rank for ${member.opgg}:`, error);
          return {
            member,
            status: 'error' as const,
          };
        }
      }),
    );

    // Split results into separate arrays
    const membersWithRanks = processedMembers
      .filter(result => result.status === 'success')
      .map(result => (result as any).rankData);

    const membersWithoutOpgg = processedMembers
      .filter(result => result.status === 'missing')
      .map(result => result.member);

    const membersWithErrors = processedMembers
      .filter(result => result.status === 'error')
      .map(result => result.member);

    // Calculate average team elo
    const { formattedElo } = calculateTeamAverageElo(membersWithRanks);

    // Add team average elo to the embed description with emoji
    embed.setDescription(
      `${StatusIcons.TROPHY} **Team Average ELO:** ${formattedElo}\n` +
        `${StatusIcons.INFO} Based on ${membersWithRanks.length} ranked player${membersWithRanks.length !== 1 ? 's' : ''}`,
    );

    // Set embed color based on highest ranked player
    if (membersWithRanks.length > 0) {
      // Find highest ranked player using the predefined priority list
      const highestRankTier = membersWithRanks.reduce((highest, member) => {
        const memberIdx = RANK_PRIORITY.indexOf(member.tier);
        const highestIdx = RANK_PRIORITY.indexOf(highest);
        return memberIdx < highestIdx ? member.tier : highest;
      }, 'UNRANKED');

      // Set embed color
      embed.setColor(RankColor[highestRankTier as keyof typeof RankColor] || MessageColors.TEAM);
    }

    // Sort members by ELO within each role for better display
    membersWithRanks.sort((a, b) => b.eloValue - a.eloValue);

    // Group members by role more efficiently
    const roleGroups = membersWithRanks.reduce((groups, member) => {
      const role = member.role || 'Unassigned';
      if (!groups.has(role)) {
        groups.set(role, []);
      }
      groups.get(role).push(member);
      return groups;
    }, new Map<string, any[]>());

    // Add fields for roles in order
    for (const role of ROLE_ORDER) {
      if (roleGroups.has(role)) {
        const members = roleGroups.get(role);
        const roleIcon = getRoleIcon(role);

        embed.addFields({
          name: `${roleIcon} ${role}`,
          value: members.map(formatMember).join('\n') || 'No players',
          inline: false,
        });

        // Remove processed role
        roleGroups.delete(role);
      }
    }

    // Add any remaining roles
    for (const [role, members] of roleGroups.entries()) {
      const roleIcon = getRoleIcon(role);

      embed.addFields({
        name: `${roleIcon} ${role}`,
        value: members.map(formatMember).join('\n') || 'No players',
        inline: false,
      });
    }

    // Add section to highlight top performers
    if (membersWithRanks.length > 0) {
      const topPlayer = membersWithRanks.reduce((highest, current) =>
        current.eloValue > highest.eloValue ? current : highest,
      );

      embed.addFields({
        name: `${StatusIcons.STAR} Top Player`,
        value: formatMember(topPlayer),
        inline: false,
      });
    }

    // Add note about players without OP.GG links
    if (membersWithoutOpgg.length > 0) {
      const formatMemberSimple = (member: any) =>
        `${member.isCaptain ? StatusIcons.CROWN : '▫️'} <@${member.discordId}>`;

      embed.addFields({
        name: `${StatusIcons.WARNING} Players Without OP.GG Links`,
        value: membersWithoutOpgg.map(formatMemberSimple).join(', '),
        inline: false,
      });
    }

    // Add error section if there were issues fetching ranks
    if (membersWithErrors.length > 0) {
      const formatMemberSimple = (member: any) =>
        `${member.isCaptain ? StatusIcons.CROWN : '▫️'} <@${member.discordId}>`;

      embed.addFields({
        name: `${StatusIcons.ERROR} Failed to Fetch Ranks`,
        value: `Could not retrieve rank data for: ${membersWithErrors.map(formatMemberSimple).join(', ')}`,
        inline: false,
      });
    }

    // Add a useful note about updating OP.GG links
    embed.addFields({
      name: `${StatusIcons.INFO} How to Update`,
      value: `Team members can update their OP.GG links using the \`/team update_member\` command.`,
      inline: false,
    });

    // Set footer with last updated time
    embed.setFooter({
      text: `Team ID: ${teamId} • Updated: ${new Date().toLocaleString()}`,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error fetching team ranks:', error);

    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Error Fetching Team Ranks',
          'An error occurred while fetching team ranks.',
          'This could be due to Riot API issues or rate limiting. Please try again later.',
        ),
      ],
    });
  }
}
