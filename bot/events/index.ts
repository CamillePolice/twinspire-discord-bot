import { Client } from 'discord.js';
import { logger } from '../utils/logger';
import { ready } from './ready';
import { interactionCreate } from './interactionCreate';
import { guildCreate } from './guildCreate';
import { guildDelete } from './guildDelete';

// Register all event handlers
export function registerEvents(client: Client): void {
  // Register each event handler
  client.once('ready', ready);
  client.on('interactionCreate', interactionCreate);
  client.on('guildCreate', guildCreate);
  client.on('guildDelete', guildDelete);
  
  logger.info('Event handlers registered');
}