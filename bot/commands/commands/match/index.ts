import { ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types';
import { buildMatchCommand } from '../../builders/match.builders';
import { handleMatchCommand } from '../../handlers/match.handlers';

const matchCommand: Command<ChatInputCommandInteraction> = {
  data: buildMatchCommand.data,
  execute: handleMatchCommand.execute,
};

export default matchCommand;
