import { ButtonInteraction, ChatInputCommandInteraction, Interaction } from 'discord.js';
import { commands } from '../commands';
import { logger } from '../utils/logger.utils';
import { handleButtonInteraction } from './button-interaction.events';

export async function interactionCreate(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction as ChatInputCommandInteraction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction as ButtonInteraction);
    }
  } catch (error) {
    logger.error(`Error handling interaction:`, error as Error);
    const content = 'There was an error processing this interaction!';

    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  }
}
