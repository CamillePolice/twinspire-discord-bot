import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('admin-create-team')
  .setDescription('Create a new team (Admin only)')
  .addStringOption(option =>
    option.setName('team_id').setDescription('Unique identifier for the team').setRequired(true),
  )
  .addStringOption(option =>
    option.setName('name').setDescription('Name of the team').setRequired(true),
  )
  .addUserOption(option =>
    option
      .setName('captain')
      .setDescription('Discord user to be set as team captain')
      .setRequired(true),
  )
  .addStringOption(option =>
    option
      .setName('captain_role')
      .setDescription('Role of the captain in the team')
      .setRequired(true)
      .addChoices(
        { name: 'Top', value: 'TOP' },
        { name: 'Jungle', value: 'JUNGLE' },
        { name: 'Mid', value: 'MID' },
        { name: 'ADC', value: 'ADC' },
        { name: 'Support', value: 'SUPPORT' },
        { name: 'Fill', value: 'FILL' },
      ),
  )
  .addStringOption(option =>
    option
      .setName('captain_opgg')
      .setDescription('OP.GG profile URL of the captain')
      .setRequired(false),
  );
