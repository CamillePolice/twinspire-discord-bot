import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { TournamentService } from '../../../../services/tournament/tournament.services';
import { Team } from '../../../../database/models';
import TeamTournament from '../../../../database/models/team-tournament.model';
import { TournamentStatus } from '../../../../database/enums/tournament-status.enums';
import {
  StatusIcons,
  createErrorEmbed,
  createWarningEmbed,
  createTournamentEmbed,
} from '../../../../helpers/message.helpers';

const tournamentService = new TournamentService();

export async function handleAddTeamToTournament(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply();

  try {
    const tournamentId = interaction.options.getString('tournament_id', true);
    const teamId = interaction.options.getString('team_id', true);
    const tier = interaction.options.getInteger('tier', true);

    const tournament = await tournamentService.getTournamentById(tournamentId);
    if (!tournament) {
      const errorEmbed = createErrorEmbed(
        'Tournament Not Found',
        `Could not find a tournament with ID: \`${tournamentId}\``,
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    if (tournament.status !== TournamentStatus.UPCOMING) {
      const warningEmbed = createWarningEmbed(
        'Tournament Not Available',
        `Teams can only be added to upcoming tournaments. This tournament is currently \`${tournament.status}\`.`,
      );
      await interaction.editReply({ embeds: [warningEmbed] });
      return;
    }

    if (tier < 1 || tier > tournament.maxTiers) {
      const warningEmbed = createWarningEmbed(
        'Invalid Tier',
        `The tier must be between 1 and ${tournament.maxTiers} for this tournament.`,
      );
      await interaction.editReply({ embeds: [warningEmbed] });
      return;
    }

    const team = await Team.findOne({ teamId });
    if (!team) {
      const errorEmbed = createErrorEmbed(
        'Team Not Found',
        `Could not find a team with ID: \`${teamId}\``,
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    const existingEntry = await tournamentService.getTeamTournamentStats(teamId, tournamentId);
    if (existingEntry) {
      const warningEmbed = createWarningEmbed(
        'Already Registered',
        `Team **${team.name}** is already registered in tournament **${tournament.name}**.`,
      );
      await interaction.editReply({ embeds: [warningEmbed] });
      return;
    }

    const teamTournament = new TeamTournament({
      team: team._id,
      tournament: tournament._id,
      tier,
      prestige: 0,
      wins: 0,
      losses: 0,
      winStreak: 0,
    });

    await teamTournament.save();

    // Update team's tournaments array
    await Team.findByIdAndUpdate(
      team._id,
      { $push: { tournaments: teamTournament._id } },
      { new: true },
    );

    // Use tournament embed helper with success-themed description
    const embed = createTournamentEmbed(
      'Team Registration Success',
      `${StatusIcons.SUCCESS} Successfully added **${team.name}** to **${tournament.name}**`,
    );

    embed.addFields(
      {
        name: `${StatusIcons.TROPHY} Tournament`,
        value: tournament.name,
        inline: true,
      },
      {
        name: `🛡️ Team`,
        value: team.name,
        inline: true,
      },
      {
        name: `${tier === 1 ? StatusIcons.STAR : StatusIcons.UP} Starting Tier`,
        value: `Tier ${tier} of ${tournament.maxTiers}`,
        inline: true,
      },
      {
        name: `${StatusIcons.INFO} Status`,
        value: `Ready to compete when the tournament begins on <t:${Math.floor(tournament.startDate.getTime() / 1000)}:D>`,
        inline: false,
      },
    );

    await interaction.editReply({ embeds: [embed] });
    logger.info(
      `Added team ${team.name} (${teamId}) to tournament ${tournament.name} (${tournamentId}) at tier ${tier}`,
    );
  } catch (error) {
    logger.error('Error adding team to tournament:', error);
    const errorEmbed = createErrorEmbed(
      'Registration Failed',
      'Failed to add team to tournament. Please try again later.',
      'Check server logs for more details.',
    );
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}
