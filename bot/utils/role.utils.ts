import { ChatInputCommandInteraction, GuildMember, Role } from 'discord.js';
import { createErrorEmbed } from '../helpers/message.helpers';

const ADMIN_ROLES = ['Directeur', 'Co-Directeur'];

export async function checkAdminRole(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const member = interaction.member as GuildMember;
  if (!member) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Access Denied', 'This command can only be used in a server.')],
    });
    return false;
  }

  const hasAdminRole = member.roles.cache.some((role: Role) => ADMIN_ROLES.includes(role.name));
  
  if (!hasAdminRole) {
    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Access Denied',
          'You do not have permission to use this command.',
          'This command requires Directeur or Co-Directeur role.',
        ),
      ],
    });
    return false;
  }

  return true;
} 