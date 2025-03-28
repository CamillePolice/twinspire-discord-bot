import { SlashCommandBuilder } from 'discord.js';

export const command = {
    data: new SlashCommandBuilder()
        .setName('nbrandom')
        .setDescription('Génère un nombre aléatoire entre 0 et une valeur choisie.')
        .addIntegerOption(option =>
            option
                .setName('max')
                .setDescription('La valeur maximale (incluse) pour le tirage aléatoire.')
                .setRequired(true)
        ),
    async execute(interaction: any) {
        const max = interaction.options.getInteger('max');

        if (max < 0) {
            await interaction.reply('Veuillez entrer une valeur positive.');
            return;
        }

        const randomNumber = Math.floor(Math.random() * (max + 1));
        await interaction.reply(`🎲 Le nombre aléatoire entre 0 et ${max} est : **${randomNumber}**`);
    },
};