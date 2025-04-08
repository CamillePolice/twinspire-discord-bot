import { CacheType, CommandInteraction, SlashCommandBuilder, CommandInteractionOptionResolver } from 'discord.js';
import { randomInt } from 'crypto';

export const buildRollCommand: CommandBuilder<CommandInteraction> = {
  data: new SlashCommandBuilder()
  .setName('roll')
  .setDescription('Génère un nombre aléatoire entre 0 et le nombre donné.')
  .addIntegerOption(option => 
      option.setName('max')
          .setDescription('Le nombre maximum du tirage')
          .setRequired(true)
  ),

  execute: async (interaction: CommandInteraction<CacheType>) => {
    const options = interaction.options as CommandInteractionOptionResolver;
    const max = options.getInteger('max', true);
    
    if (max < 0) {
        await interaction.reply('Veuillez entrer un nombre positif.');
        return;
    }
    
    const randomNumber = randomInt(0, max + 1); // Utilisation de randomInt de crypto

    await interaction.reply(`🎲 Résultat du roll : **${randomNumber}** (entre 0 et ${max})`);
  },
};
