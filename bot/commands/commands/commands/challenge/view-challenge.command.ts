import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { ChallengeService } from '../../../../services/tournament/challenge.services';
import { TeamTournament } from '../../../../database/models';

const challengeService = new ChallengeService();

export async function handleViewChallenge(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const challengeId = interaction.options.getString('challenge_id', true);
    const challenge = await challengeService.getChallengeById(challengeId);

    if (!challenge) {
      await interaction.editReply(`Challenge ${challengeId} not found`);
      return;
    }

    // Populate team data with discordRole
    const challengerTeamTournament = await TeamTournament.findById(
      challenge.challengerTeamTournament._id,
    ).populate({
      path: 'team',
      select: 'name discordRole',
    });

    const defendingTeamTournament = await TeamTournament.findById(
      challenge.defendingTeamTournament._id,
    ).populate({
      path: 'team',
      select: 'name discordRole',
    });

    if (!challengerTeamTournament || !defendingTeamTournament) {
      await interaction.editReply('Error: Could not find team information for this challenge');
      return;
    }

    // Format team names with Discord roles
    const challengerDisplay = challengerTeamTournament.team.discordRole
      ? `${challengerTeamTournament.team.name} (${challengerTeamTournament.team.discordRole})`
      : challengerTeamTournament.team.name;

    const defenderDisplay = defendingTeamTournament.team.discordRole
      ? `${defendingTeamTournament.team.name} (${defendingTeamTournament.team.discordRole})`
      : defendingTeamTournament.team.name;

    const embed = new EmbedBuilder().setTitle(`Challenge ${challengeId}`).addFields(
      { name: 'Status', value: challenge.status, inline: true },
      { name: 'Challenger', value: challengerDisplay, inline: true },
      { name: 'Defender', value: defenderDisplay, inline: true },
      {
        name: 'Tier',
        value: `Challenger: ${challenge.tierBefore.challenger}, Defender: ${challenge.tierBefore.defending}`,
        inline: false,
      },
    );

    if (challenge.result) {
      // Determine winner team and its Discord role
      const isChallengerWinner =
        challenge.result.winner === challengerTeamTournament._id.toString();
      const winnerTeam = isChallengerWinner ? challengerTeamTournament : defendingTeamTournament;

      const winnerDisplay = winnerTeam.team.discordRole
        ? `${winnerTeam.team.name} (${winnerTeam.team.discordRole})`
        : winnerTeam.team.name;

      embed.addFields(
        { name: 'Winner', value: winnerDisplay, inline: true },
        { name: 'Score', value: challenge.result.score, inline: true },
      );
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error viewing challenge:', error as Error);
    await interaction.editReply('An error occurred while viewing the challenge');
  }
}
