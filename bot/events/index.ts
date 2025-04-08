import { Client } from 'discord.js';
import { logger } from '../utils/logger.utils';
import { ready } from './ready';
import { interactionCreate } from './interaction-create.events';
import { guildCreate } from './guilds/guild-create.events';
import { guildDelete } from './guilds/guild-delete.events';
import { guildMemberAdd } from './guilds/guild-members.events';
import { guildMemberUpdate } from './guilds/guild-members.events';
import { messageReactionAdd } from './message-reaction.events';
import { messageCreate } from './beer-twinspire.events'; 

// Register all event handlers
export function registerEvents(client: Client): void {
  client.once('ready', ready);
  client.on('interactionCreate', interactionCreate);
  client.on('guildCreate', guildCreate);
  client.on('guildDelete', guildDelete);
  client.on('guildMemberAdd', guildMemberAdd);
  client.on('guildMemberUpdate', guildMemberUpdate);
  client.on('messageReactionAdd', messageReactionAdd);
  client.on('messageCreate', messageCreate); 

  logger.info('Event handlers registered');
}
