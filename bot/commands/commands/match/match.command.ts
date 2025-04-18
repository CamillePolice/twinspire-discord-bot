import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { logger } from '../../../utils/logger.utils';
import { MatchResult } from '../../../database/models/match-result.model';
import { Team } from '../../../database/models';
import { createErrorEmbed, StatusIcons } from '../../../helpers/message.helpers';
import { MatchType } from '../../../database/enums/match.enums';

export async function handleMatch(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const team1Input = interaction.options.getString('team1', true);
    const team2Input = interaction.options.getString('team2', true);
    const score = interaction.options.getString('score', true);
    const matchType = interaction.options.getString('match_type', true) as MatchType;
    const winner = interaction.options.getString('winner', true);
    const dateInput = interaction.options.getString('date', false);

    // Get all screenshots
    const screenshots = [];
    for (let i = 1; i <= 5; i++) {
      const screenshot = interaction.options.getAttachment(`screenshot${i}`);
      if (screenshot) {
        screenshots.push(screenshot);
      }
    }

    // Parse date if provided
    let date = new Date();
    if (dateInput) {
      const [day, month] = dateInput.split('/').map(Number);
      if (day && month) {
        date = new Date(new Date().getFullYear(), month - 1, day);
      }
    }

    // Process team1
    const team1 = await processTeam(team1Input, interaction);
    if (!team1) {
      const embed = createErrorEmbed(
        'Invalid Team',
        `Could not process team 1: ${team1Input}`,
        'Please verify the team name or role and try again.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Process team2
    const team2 = await processTeam(team2Input, interaction);
    if (!team2) {
      const embed = createErrorEmbed(
        'Invalid Team',
        `Could not process team 2: ${team2Input}`,
        'Please verify the team name or role and try again.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create match result
    const matchResult = new MatchResult({
      team1,
      team2,
      score,
      matchType,
      winner: winner === 'team1' ? team1.name : team2.name,
      date,
      screenshots: screenshots.map(screenshot => screenshot.url),
    });

    await matchResult.save();

    // Fetch team roles if needed
    const team1Data = team1.teamId ? await Team.findById(team1.teamId) : null;
    const team2Data = team2.teamId ? await Team.findById(team2.teamId) : null;

    // Create embed for the match result
    const embed = new EmbedBuilder()
      .setTitle('Match Result')
      .setColor('#00ff00')
      .setDescription(`${StatusIcons.TROPHY} New match result recorded!`)
      .addFields(
        {
          name: 'Teams',
          value: `${team1.teamId ? `<${team1Data?.discordRole}>` : team1.name} VS ${team2.teamId ? `<@&${team2Data?.discordRole}>` : team2.name}`,
        },
        { name: 'Score', value: score, inline: true },
        { name: 'Match Type', value: matchType, inline: true },
        {
          name: 'Winner',
          value:
            winner === 'team1'
              ? team1.teamId
                ? `<${team1Data?.discordRole}>`
                : team1.name
              : team2.teamId
                ? `<${team2Data?.discordRole}>`
                : team2.name,
          inline: true,
        },
        { name: 'Date', value: date.toLocaleDateString(), inline: true },
      );

    // Find the results channel
    const resultsChannel = interaction.guild?.channels.cache.find(
      channel => channel.name === '🏆│résultats' && channel instanceof TextChannel,
    ) as TextChannel;

    if (!resultsChannel) {
      const embed = createErrorEmbed(
        'Channel Not Found',
        'Could not find the results channel.',
        'Please make sure the 🏆│résultats channel exists.',
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create multiple embeds for pagination if there are screenshots
    const embeds: EmbedBuilder[] = [];
    embeds.push(embed);

    // Add screenshots for each game
    if (screenshots.length > 0) {
      screenshots.forEach((screenshot, index) => {
        const gameNumber = index + 1;
        const screenshotEmbed = new EmbedBuilder()
          .setTitle(`Game ${gameNumber} Screenshot`)
          .setColor('#00ff00')
          .setDescription(`${StatusIcons.TROPHY} Game ${gameNumber} result screenshot:`)
          .setImage(screenshot.url);
        embeds.push(screenshotEmbed);
      });
    }

    // Send the match result to the results channel
    if (embeds.length === 1) {
      await resultsChannel.send({ embeds: [embeds[0]] });
    } else {
      // Create pagination if there are multiple embeds
      let currentPage = 0;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⬅️')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➡️')
          .setDisabled(embeds.length <= 1),
      );

      const response = await resultsChannel.send({
        embeds: [embeds[0]],
        components: [row],
      });

      // Create collector for button interactions
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000, // 2 minutes
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: `${StatusIcons.ERROR} Only ${interaction.user.toString()} can use these buttons.`,
            ephemeral: true,
          });
          return;
        }

        await i.deferUpdate();

        if (i.customId === 'prev') {
          if (currentPage > 0) {
            currentPage--;
          }
        } else if (i.customId === 'next') {
          if (currentPage < embeds.length - 1) {
            currentPage++;
          }
        }

        // Update buttons
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⬅️')
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('➡️')
            .setDisabled(currentPage === embeds.length - 1),
        );

        await response.edit({
          embeds: [embeds[currentPage]],
          components: [row],
        });
      });

      collector.on('end', async () => {
        // Disable all buttons when collector ends
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️')
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➡️')
            .setDisabled(true),
        );

        await response.edit({
          embeds: [embeds[currentPage]],
          components: [row],
        });
      });
    }

    // Send confirmation to the user
    await interaction.editReply({
      content: `${StatusIcons.SUCCESS} Match result has been posted in ${resultsChannel.toString()}`,
    });
  } catch (error) {
    logger.error('Error recording match result:', error as Error);
    const embed = createErrorEmbed(
      'Command Error',
      'An error occurred while recording the match result.',
      error instanceof Error ? error.message : 'Unknown error',
    );
    await interaction.editReply({ embeds: [embed] });
  }
}

async function processTeam(teamInput: string, interaction: ChatInputCommandInteraction) {
  // Check if the input is a role mention
  const roleMatch = teamInput.match(/<@&(\d+)>/);
  if (roleMatch) {
    const roleId = roleMatch[1];
    const role = await interaction.guild?.roles.fetch(roleId);
    if (role) {
      // Find team by discord role
      const team = await Team.findOne({ discordRole: roleId });
      if (team) {
        return {
          name: team.name,
          teamId: team._id,
        };
      }
      return {
        name: role.name,
      };
    }
  }

  // Check if the input is a team name from the database
  const team = await Team.findOne({ name: teamInput });
  if (team) {
    return {
      name: team.name,
      teamId: team._id,
    };
  }

  // If neither, treat as an external team name
  return {
    name: teamInput,
  };
}
