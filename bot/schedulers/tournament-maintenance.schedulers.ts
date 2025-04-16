import { Client, TextChannel } from 'discord.js';
import { TournamentService } from '../services/tournament/tournament.services';
import { ChallengeService } from '../services/tournament/challenge.services';
import { logger } from '../utils/logger.utils';
import { startSession } from 'mongoose';
import { IChallenge, ITeamTournament, ITournament } from '../database/models';

/**
 * Configuration options for the tournament maintenance scheduler
 */
interface MaintenanceConfig {
  /** Default grace period in days for overdue challenges */
  defaultGracePeriodDays: number;
  /** Maximum number of retries for failed operations */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelayMs: number;
  /** Batch size for processing challenges */
  batchSize: number;
}

/**
 * Class to handle scheduled tournament maintenance tasks
 */
export class TournamentMaintenanceScheduler {
  private client: Client;
  private tournamentService: TournamentService;
  private challengeService: ChallengeService;
  private maintenanceChannelId: string | null = null;
  private isRunning: boolean = false;
  private config: MaintenanceConfig;

  constructor(client: Client, config?: Partial<MaintenanceConfig>) {
    this.client = client;
    this.tournamentService = new TournamentService();
    this.challengeService = new ChallengeService();

    // Default configuration
    this.config = {
      defaultGracePeriodDays: 2,
      maxRetries: 3,
      retryDelayMs: 5000,
      batchSize: 10,
      ...config,
    };
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
        await this.challengeService.getPastDueDefenderResponses(tournamentId);

      if (overdueResponses.length === 0) {
        logger.info(`No overdue challenge responses found for tournament ${tournament.name}`);
        return;
      }

      logger.info(
        `Found ${overdueResponses.length} overdue challenges in tournament ${tournament.name}`,
      );

      // Process challenges in batches to avoid memory issues
      for (let i = 0; i < overdueResponses.length; i += this.config.batchSize) {
        const batch = overdueResponses.slice(i, i + this.config.batchSize);

        // Get team details with populated team information for this batch
        const teams = await this.tournamentService.getTournamentStandings(tournamentId);

        // Process each challenge in the batch
        await Promise.all(
          batch.map(challenge => this.processChallenge(challenge, teams, tournament)),
        );
      }
    } catch (error) {
      logger.error(`Error processing overdue challenges for tournament ${tournamentId}: ${error}`);
    }
  }

  /**
   * Process a single challenge with retry mechanism
   */
  private async processChallenge(
    challenge: IChallenge,
    teams: ITeamTournament[],
    tournament: ITournament,
  ): Promise<void> {
    let retries = 0;

    while (retries < this.config.maxRetries) {
      try {
        const challengerTeam = teams.find(
          team => team._id.toString() === challenge.challengerTeamTournament.team.toString(),
        );
        const defendingTeam = teams.find(
          team => team._id.toString() === challenge.defendingTeamTournament.team.toString(),
        );

        // Get grace period from tournament rules or use default
        const gracePeriodDays =
          tournament.rules.gracePeriodDays || this.config.defaultGracePeriodDays;

        // Only auto-forfeit challenges that are more than grace period past the deadline
        const createdDate = new Date(challenge.createdAt);
        const responseDeadline = new Date(createdDate);
        responseDeadline.setDate(
          responseDeadline.getDate() + tournament.rules.challengeTimeframeInDays,
        );

        const gracePeriodEnd = new Date(responseDeadline);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

        const now = new Date();

        if (now < gracePeriodEnd) {
          logger.info(
            `Challenge ${challenge.challengeId} is overdue but within grace period (${gracePeriodDays} days), skipping auto-forfeit`,
          );
          return;
        }

        // Auto-forfeit the challenge (defender loses)
        logger.info(
          `Auto-forfeiting challenge ${challenge.challengeId} due to no response from defender`,
        );

        // Use a transaction to ensure data consistency
        const session = await startSession();
        session.startTransaction();

        try {
          // Submit forfeit
          const success = await this.challengeService.forfeitChallenge(
            challenge.challengeId,
            challenge.defendingTeamTournament.team.toString(),
          );

          if (success) {
            logger.info(`Successfully auto-forfeited challenge ${challenge.challengeId}`);

            // Send notification
            await this.sendNotification(
              `⚠️ **Auto-Forfeit**: Challenge between ${challengerTeam?.team?.name || 'Unknown Team'} and ${defendingTeam?.team?.name || 'Unknown Team'} has been auto-forfeited due to no response from the defending team within the required timeframe.`,
              challenge.challengeId,
              challengerTeam?.team?.captainId,
              defendingTeam?.team?.captainId,
            );

            // Commit the transaction
            await session.commitTransaction();
            return;
          } else {
            logger.error(`Failed to auto-forfeit challenge ${challenge.challengeId}`);
            await session.abortTransaction();
            throw new Error('Failed to forfeit challenge');
          }
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      } catch (error) {
        retries++;
        logger.error(
          `Error processing challenge ${challenge.challengeId} (attempt ${retries}/${this.config.maxRetries}): ${error}`,
        );

        if (retries >= this.config.maxRetries) {
          logger.error(
            `Failed to process challenge ${challenge.challengeId} after ${this.config.maxRetries} attempts`,
          );
          return;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
      }
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

  /**
   * Update the maintenance configuration
   */
  public updateConfig(newConfig: Partial<MaintenanceConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    logger.info('Tournament maintenance configuration updated');
  }
}
