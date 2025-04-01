import { Interaction } from 'discord.js';
import { commands } from '../commands';
import { logger } from '../utils/logger';

export async function interactionCreate(interaction: Interaction): Promise<void> {
  // Only handle chat command interactions
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error as Error);
    const content = 'There was an error executing this command!';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  }
}
