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

const challengeService = new ChallengeService();

export async function handleCheckTimeouts(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const tournamentId = interaction.options.getString('tournament_id', true);
    const pastDueChallenges = await challengeService.getPastDueDefenderResponses(tournamentId);

    if (pastDueChallenges.length === 0) {
      const embed = createAdminEmbed(
        'Past Due Challenges',
        `${StatusIcons.SUCCESS} No past due challenges found for this tournament.`,
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create base embed
    const embed = createAdminEmbed(
      'Past Due Challenges',
      `${StatusIcons.WARNING} Found ${pastDueChallenges.length} challenges that need attention.`,
    );

    // Add more descriptive fields to each challenge
    for (const challenge of pastDueChallenges) {
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

      // Calculate how many days past due
      const createDate = new Date(challenge.createdAt);
      const now = new Date();
      const daysPastDue = Math.floor(
        (now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      embed.addFields({
        name: `Challenge ${challenge.challengeId}`,
        value: [
          `**Challenger:** ${challengerTeamName}`,
          `**Defender:** ${defendingTeamName}`,
          `**Status:** ${challenge.status}`,
          `**Created:** ${formatTimestamp(createDate, 'D')}`,
          `**Days Past Due:** ${daysPastDue}`,
          `**Action Required:** Defender needs to respond or may be auto-forfeited`,
        ].join('\n'),
      });
    }

    embed.setFooter({
      text: `Use /admin-challenge forfeit to manually forfeit a challenge if needed`,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error checking timeouts:', error as Error);

    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while checking for timeout challenges.',
      error instanceof Error ? error.message : 'Unknown error',
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
