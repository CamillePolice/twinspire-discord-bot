import { ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { checkAdminRole } from '../../../../utils/role.utils';
import {
  createErrorEmbed,
  createAdminEmbed,
  StatusIcons,
  getRoleIcon,
} from '../../../../helpers/message.helpers';
import Team from '../../../../database/models/team.model';
import { Role } from '../../../../database/enums/role.enums';
import { v4 as uuidv4 } from 'uuid';

export async function handleAdminCreateTeam(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user has admin permissions
    if (!(await checkAdminRole(interaction))) {
      return;
    }

    const name = interaction.options.getString('name', true);
    const captain = interaction.options.getUser('captain', true);
    const captainRole = interaction.options.getString('captain_role', true) as Role;
    const captainOpgg = interaction.options.getString('captain_opgg', false) || '';

    // Check if team name already exists
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      const embed = createErrorEmbed(
        'Team Creation Failed',
        'A team with this name already exists.',
        'Please choose a different team name.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create new team
    const newTeam = new Team({
      teamId: uuidv4(),
      name,
      captainId: captain.id,
      members: [
        {
          discordId: captain.id,
          username: captain.username,
          role: captainRole,
          isCaptain: true,
          opgg: captainOpgg,
        },
      ],
    });

    await newTeam.save();

    // Get the role icon for the captain's role
    const roleIcon = getRoleIcon(captainRole);

    const embed = createAdminEmbed(
      'Team Created',
      `${StatusIcons.SUCCESS} Successfully created team "${name}"`,
    ).addFields(
      { name: 'Team ID', value: newTeam.teamId, inline: true },
      { name: 'Team Name', value: name, inline: true },
      { name: 'Captain', value: `<@${captain.id}>`, inline: true },
      { name: 'Role', value: `${roleIcon} ${captainRole}`, inline: true },
    );

    if (captainOpgg) {
      embed.addFields({
        name: 'OP.GG',
        value: `[View Profile](${captainOpgg})`,
        inline: true,
      });
    }

    embed.addFields({
      name: 'Next Steps',
      value:
        'The captain can now add more members using `/team add_member` or the captain can register for tournaments using `/tournament register`.',
    });

    await interaction.editReply({ embeds: [embed] });

    // Send a direct message to the captain
    try {
      await captain.send({
        embeds: [
          createAdminEmbed(
            'Welcome Team Captain!',
            `${StatusIcons.CROWN} You have been assigned as the captain of team "${name}"`,
          ).addFields(
            { name: 'Team ID', value: newTeam.teamId, inline: true },
            { name: 'Team Name', value: name, inline: true },
            { name: 'Your Role', value: `${roleIcon} ${captainRole}`, inline: true },
            {
              name: 'Next Steps',
              value:
                'You can now add more members using `/team add_member` or register for tournaments using `/tournament register`.',
            },
          ),
        ],
      });
    } catch (error) {
      logger.warn(`Could not send DM to captain ${captain.id}`);
    }
  } catch (error) {
    logger.error('Error creating team:', error as Error);

    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while creating the team.',
      error instanceof Error ? error.message : 'Unknown error',
    );

    await interaction.editReply({ embeds: [embed] });
  }
}
