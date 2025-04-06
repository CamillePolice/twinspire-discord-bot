import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  CacheType,
} from 'discord.js';
import { syncGuildMembers } from '../../guilds/sync-members.guilds';
import { logger } from '../../utils/logger.utils';

export default {
  data: new SlashCommandBuilder()
    .setName('syncmembers')
    .setDescription('Synchronize all server members to the database')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Restrict to admins only
    .setDMPermission(false), // Cannot be used in DMs

  async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    // Only server administrators can use this command
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'You need Administrator permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    // Defer the reply as this might take a while
    await interaction.deferReply({ ephemeral: true });

    try {
      // Log the command usage
      logger.info(
        `User ${interaction.user.tag} triggered syncmembers in guild ${interaction.guild?.name} (${interaction.guild?.id})`,
      );

      if (!interaction.guild) {
        await interaction.editReply('This command can only be used in a server.');
        return;
      }

      // Start the sync process
      await interaction.editReply(
        'Starting member synchronization. This may take a while for large servers...',
      );

      // Get the member count for logging purposes
      const memberCount = interaction.guild.memberCount;

      // Call the sync function
      await syncGuildMembers(interaction.guild);

      // Respond with success
      await interaction.editReply(
        `Successfully synchronized ${memberCount} members to the database!`,
      );
    } catch (error) {
      logger.error('Error executing syncmembers command:', error as Error);
      await interaction.editReply(
        'There was an error synchronizing members. Please check the logs for more information.',
      );
    }
  },
};
