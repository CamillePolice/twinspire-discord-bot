import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { ChallengeService } from '../../../services/tournament/challenge.services';
import Team from '../../../database/models/team.model';

const challengeService = new ChallengeService();

export async function handleChallenge(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const defendingTeamId = interaction.options.getString('defending_team', true);
    const tournamentId = interaction.options.getString('tournament_id', true);

    // Get the challenger team (current user's team)
    const teams = await Team.find({
      'members.discordId': interaction.user.id,
      'members.isCaptain': true,
    });
    if (teams.length === 0) {
      await interaction.editReply('You must be a team captain to issue a challenge');
      return;
    }

    const challengerTeam = teams[0];
    const challenge = await challengeService.createChallenge(
      challengerTeam.teamId,
      defendingTeamId,
      tournamentId,
    );

    if (challenge) {
      await interaction.editReply(
        `Challenge created successfully! Challenge ID: ${challenge.challengeId}`,
      );
    } else {
      await interaction.editReply(
        'Failed to create challenge. Please check if all requirements are met.',
      );
    }
  } catch (error) {
    logger.error('Error creating challenge:', error as Error);
    await interaction.editReply('An error occurred while creating the challenge');
  }
}
