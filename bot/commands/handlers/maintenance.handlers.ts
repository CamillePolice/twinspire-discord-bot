import { ChatInputCommandInteraction, TextChannel, EmbedBuilder } from 'discord.js';
import { logger } from '../../utils/logger.utils';
import { TournamentMaintenanceScheduler } from '../../schedulers/tournament-maintenance.schedulers';

let maintenanceScheduler: TournamentMaintenanceScheduler | null = null;

export function setMaintenanceScheduler(scheduler: TournamentMaintenanceScheduler): void {
  maintenanceScheduler = scheduler;
}

export const handleMaintenanceCommand = {
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (!maintenanceScheduler) {
        await interaction.reply({
          content:
            'Tournament maintenance scheduler is not initialized. Please check the bot logs.',
          ephemeral: true,
        });
        return;
      }

      switch (subcommand) {
        case 'set_channel':
          await handleSetChannel(interaction, maintenanceScheduler);
          break;
        case 'run':
          await handleRunMaintenance(interaction, maintenanceScheduler);
          break;
        case 'status':
          await handleMaintenanceStatus(interaction, maintenanceScheduler);
          break;
        default:
          await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
      }
    } catch (error) {
      logger.error(`Error executing maintenance ${subcommand} command:`, error as Error);
      await interaction.reply({
        content: 'An error occurred while processing the command. Please check the logs.',
        ephemeral: true,
      });
    }
  },
};

async function handleSetChannel(
  interaction: ChatInputCommandInteraction,
  scheduler: TournamentMaintenanceScheduler,
): Promise<void> {
  const channel = interaction.options.getChannel('channel', true) as TextChannel;

  const me = interaction.guild?.members.me;
  if (!me) {
    await interaction.reply({
      content: 'Could not determine bot permissions. Please try again.',
      ephemeral: true,
    });
    return;
  }

  const permissions = channel.permissionsFor(me);
  if (!permissions || !permissions.has('SendMessages')) {
    await interaction.reply({
      content: `I don't have permission to send messages in ${channel}. Please adjust permissions and try again.`,
      ephemeral: true,
    });
    return;
  }

  scheduler.setMaintenanceChannel(channel.id);

  await interaction.reply({
    content: `Tournament maintenance notifications will now be sent to ${channel}.`,
    ephemeral: false,
  });

  await channel.send({
    content: `🔧 This channel has been set as the tournament maintenance notification channel by <@${interaction.user.id}>.`,
  });
}

async function handleRunMaintenance(
  interaction: ChatInputCommandInteraction,
  scheduler: TournamentMaintenanceScheduler,
): Promise<void> {
  await interaction.deferReply();

  try {
    await scheduler['runMaintenance']();

    await interaction.editReply({
      content:
        '✅ Tournament maintenance tasks have been executed successfully. Check the maintenance channel for any notifications.',
    });
  } catch (error) {
    logger.error('Error running manual maintenance:', error as Error);
    await interaction.editReply({
      content: '❌ An error occurred while running maintenance tasks. Please check the logs.',
    });
  }
}

async function handleMaintenanceStatus(
  interaction: ChatInputCommandInteraction,
  scheduler: TournamentMaintenanceScheduler,
): Promise<void> {
  await interaction.deferReply();

  try {
    const isRunning = scheduler['isRunning'] || false;
    const channelId = scheduler['maintenanceChannelId'] || 'Not set';

    let channelInfo = 'Not configured';
    if (channelId !== 'Not set') {
      const channel = interaction.client.channels.cache.get(channelId) as TextChannel | undefined;
      if (channel) {
        channelInfo = `<#${channelId}>`;
      } else {
        channelInfo = `Channel ID: ${channelId} (not found)`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Tournament Maintenance Status')
      .addFields(
        { name: 'Scheduler Active', value: isRunning ? '✅ Running' : '❌ Stopped', inline: true },
        { name: 'Notification Channel', value: channelInfo, inline: true },
        {
          name: 'Schedule',
          value: isRunning
            ? 'Maintenance runs automatically daily at 2:00 AM server time'
            : 'Scheduler is not active',
          inline: false,
        },
        {
          name: 'Tasks',
          value:
            '• Check for challenges with overdue responses\n• Auto-forfeit challenges that exceed deadlines\n• Monitor tournament activity',
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'Twinspire Bot' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error getting maintenance status:', error as Error);
    await interaction.editReply({
      content: '❌ An error occurred while retrieving maintenance status. Please check the logs.',
    });
  }
}
