import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import { checkAdminRole } from '../../../../utils/role.utils';
import {
  createErrorEmbed,
  createAdminEmbed,
  StatusIcons,
  formatTimestamp,
} from '../../../../helpers/message.helpers';
import { TeamTournament } from '../../../../database/models';
import { ChallengeStatus } from '../../../../database/enums/challenge.enums';

const challengeService = new ChallengeService();

export async function handleListByStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const status = interaction.options.getString('status', true) as ChallengeStatus;
    const challenges = await challengeService.getChallengesByStatus(status);

    if (challenges.length === 0) {
      const embed = createAdminEmbed(
        `Challenges with Status: ${status}`,
        `${StatusIcons.INFO} No challenges found with status "${status}".`,
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create base embed
    const embed = createAdminEmbed(
      `Challenges with Status: ${status}`,
      `${StatusIcons.SUCCESS} Found ${challenges.length} challenges with status "${status}".`,
    );

    // Add fields for each challenge (limit to 25 to avoid Discord embed limits)
    const challengesToDisplay = challenges.slice(0, 25);
    
    for (const challenge of challengesToDisplay) {
      // Get team names for better display
      const challengerTeamTournament = await TeamTournament.findById(
        challenge.challengerTeamTournament,
      ).populate({
        path: 'team',
        select: 'name',
      });

      const defendingTeamTournament = await TeamTournament.findById(
        challenge.defendingTeamTournament,
      ).populate({
        path: 'team',
        select: 'name',
      });

      const challengerTeamName = challengerTeamTournament?.team?.name || 'Unknown Team';
      const defendingTeamName = defendingTeamTournament?.team?.name || 'Unknown Team';

      // Format creation date
      const createDate = new Date(challenge.createdAt);
      
      // Add challenge details to embed
      embed.addFields({
        name: `Challenge ${challenge.challengeId}`,
        value: [
          `**Challenger:** ${challengerTeamName}`,
          `**Defender:** ${defendingTeamName}`,
          `**Created:** ${formatTimestamp(createDate, 'D')}`,
          `**Tiers:** ${challengerTeamTournament?.tier} vs ${defendingTeamTournament?.tier}`,
        ].join('\n'),
      });
    }

    // Add note if there are more challenges than displayed
    if (challenges.length > 25) {
      embed.setFooter({
        text: `Showing 25 of ${challenges.length} challenges. Use /admin-challenge view to see details of a specific challenge.`,
      });
    } else {
      embed.setFooter({
        text: `Use /admin-challenge view to see details of a specific challenge`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error listing challenges by status:', error as Error);

    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while listing challenges by status.',
      error instanceof Error ? error.message : 'Unknown error',
    );

    await interaction.editReply({ embeds: [embed] });
  }
} 