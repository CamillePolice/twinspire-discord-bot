import { SlashCommandBuilder } from 'discord.js';
import { CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Génère un nombre aléatoire entre 0 et le nombre donné.')
    .addIntegerOption(option => 
        option.setName('max')
            .setDescription('Le nombre maximum du tirage')
            .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    const max = interaction.options.getInteger('max', true);
    if (max < 0) {
        await interaction.reply('Veuillez entrer un nombre positif.');
        return;
    }
    
    const randomNumber = Math.floor(Math.random() * (max + 1));
    await interaction.reply(`🎲 Résultat du roll : **${randomNumber}** (entre 0 et ${max})`);
}
