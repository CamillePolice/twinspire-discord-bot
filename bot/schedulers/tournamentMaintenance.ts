import { Client, TextChannel } from 'discord.js';
import { TournamentService } from '../services/tournament/tournament.services';
import { logger } from '../utils/logger.utils';

/**
 * Class to handle scheduled tournament maintenance tasks
 */
export class TournamentMaintenanceScheduler {
  private client: Client;
  private tournamentService: TournamentService;
  private maintenanceChannelId: string | null = null;
  private isRunning: boolean = false;

  constructor(client: Client) {
    this.client = client;
    this.tournamentService = new TournamentService();
  }

  /**
   * Start the maintenance scheduler
   * @param channelId Optional channel ID to send notifications to
   */
  public start(channelId?: string): void {
    if (this.isRunning) {
      logger.warn('Tournament maintenance scheduler is already running');
      return;
    }

    if (channelId) {
      this.maintenanceChannelId = channelId;
    }

    // Run immediately on start
    this.runMaintenance().catch(error => {
      logger.error('Error in initial tournament maintenance run:', error);
    });

    // Schedule maintenance to run every day at 2 AM
    const now = new Date();
    const tomorrow2AM = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0, 0);

    // Calculate milliseconds until next 2 AM
    let delay = tomorrow2AM.getTime() - now.getTime();
    if (delay < 0) {
      // If it's already past 2 AM, schedule for the next day
      delay += 24 * 60 * 60 * 1000;
    }

    // Schedule first run
    logger.info(
      `Tournament maintenance scheduled to run in ${Math.floor(delay / (1000 * 60 * 60))} hours`,
    );
    setTimeout(() => this.scheduleRecurringMaintenance(), delay);

    this.isRunning = true;
    logger.info('Tournament maintenance scheduler started');
  }

  /**
   * Schedule recurring maintenance every 24 hours
   */
  private scheduleRecurringMaintenance(): void {
    // Run maintenance
    this.runMaintenance().catch(error => {
      logger.error('Error in tournament maintenance run:', error);
    });

    // Schedule next run in 24 hours
    setTimeout(() => this.scheduleRecurringMaintenance(), 24 * 60 * 60 * 1000);
    logger.info('Next tournament maintenance scheduled in 24 hours');
  }

  /**
   * Run all maintenance tasks
   */
  private async runMaintenance(): Promise<void> {
    logger.info('Running tournament maintenance');

    try {
      // Get all active tournaments
      const activeTournaments = await this.tournamentService.getActiveTournaments();

      if (activeTournaments.length === 0) {
        logger.info('No active tournaments found for maintenance');
        return;
      }

      // Run maintenance for each tournament
      for (const tournament of activeTournaments) {
        await this.processOverdueChallenges(tournament.tournamentId);
      }

      logger.info('Tournament maintenance completed successfully');
    } catch (error) {
      logger.error(`Error running tournament maintenance: ${error}`);
    }
  }

  /**
   * Process overdue challenges for a tournament
   */
  private async processOverdueChallenges(tournamentId: string): Promise<void> {
    try {
      // Get tournament details
      const tournament = await this.tournamentService.getTournamentById(tournamentId);
      if (!tournament) {
        logger.error(`Tournament ${tournamentId} not found`);
        return;
      }

      // Get challenges with overdue responses
      const overdueResponses =
        await this.tournamentService.getPastDueDefenderResponses(tournamentId);

      if (overdueResponses.length === 0) {
        logger.info(`No overdue challenge responses found for tournament ${tournament.name}`);
        return;
      }

      logger.info(
        `Found ${overdueResponses.length} overdue challenges in tournament ${tournament.name}`,
      );

      // Get team details
      const teams = await this.tournamentService.getTournamentStandings();

      // Process each overdue challenge
      for (const challenge of overdueResponses) {
        const challengerTeam = teams.find(team => team.teamId === challenge.challengerTeamId);
        const defendingTeam = teams.find(team => team.teamId === challenge.defendingTeamId);

        // Only auto-forfeit challenges that are more than 2 days past the deadline
        const createdDate = new Date(challenge.createdAt);
        const responseDeadline = new Date(createdDate);
        responseDeadline.setDate(
          responseDeadline.getDate() + tournament.rules.challengeTimeframeInDays,
        );

        const twoDaysAfterDeadline = new Date(responseDeadline);
        twoDaysAfterDeadline.setDate(twoDaysAfterDeadline.getDate() + 2);

        const now = new Date();

        if (now < twoDaysAfterDeadline) {
          logger.info(
            `Challenge ${challenge.challengeId} is overdue but within grace period, skipping auto-forfeit`,
          );
          continue;
        }

        // Auto-forfeit the challenge (defender loses)
        logger.info(
          `Auto-forfeiting challenge ${challenge.challengeId} due to no response from defender`,
        );

        try {
          // Submit forfeit
          const success = await this.tournamentService.forfeitChallenge(
            challenge.challengeId,
            challenge.defendingTeamId,
          );

          if (success) {
            logger.info(`Successfully auto-forfeited challenge ${challenge.challengeId}`);

            // Send notification
            await this.sendNotification(
              `⚠️ **Auto-Forfeit**: Challenge between ${challengerTeam?.name || 'Unknown Team'} and ${defendingTeam?.name || 'Unknown Team'} has been auto-forfeited due to no response from the defending team within the required timeframe.`,
              challenge.challengeId,
              challengerTeam?.captainId,
              defendingTeam?.captainId,
            );
          } else {
            logger.error(`Failed to auto-forfeit challenge ${challenge.challengeId}`);
          }
        } catch (error) {
          logger.error(`Error auto-forfeiting challenge ${challenge.challengeId}: ${error}`);
        }
      }
    } catch (error) {
      logger.error(`Error processing overdue challenges for tournament ${tournamentId}: ${error}`);
    }
  }

  /**
   * Send a notification about maintenance actions
   */
  private async sendNotification(
    message: string,
    challengeId: string,
    challengerCaptainId?: string,
    defenderCaptainId?: string,
  ): Promise<void> {
    try {
      // Send to maintenance channel if configured
      if (this.maintenanceChannelId) {
        const channel = this.client.channels.cache.get(this.maintenanceChannelId) as
          | TextChannel
          | undefined;

        if (channel) {
          await channel.send({
            content: message + `\nChallenge ID: ${challengeId}`,
          });
        }
      }

      // DM team captains
      if (challengerCaptainId) {
        try {
          const challengerCaptain = await this.client.users.fetch(challengerCaptainId);
          await challengerCaptain.send(message + `\nChallenge ID: ${challengeId}`);
        } catch (dmError) {
          logger.warn(`Could not DM challenger captain ${challengerCaptainId}: ${dmError}`);
        }
      }

      if (defenderCaptainId) {
        try {
          const defenderCaptain = await this.client.users.fetch(defenderCaptainId);
          await defenderCaptain.send(message + `\nChallenge ID: ${challengeId}`);
        } catch (dmError) {
          logger.warn(`Could not DM defender captain ${defenderCaptainId}: ${dmError}`);
        }
      }
    } catch (error) {
      logger.error(`Error sending maintenance notification: ${error}`);
    }
  }

  /**
   * Set the channel to send maintenance notifications to
   */
  public setMaintenanceChannel(channelId: string): void {
    this.maintenanceChannelId = channelId;
    logger.info(`Maintenance channel set to ${channelId}`);
  }
}
