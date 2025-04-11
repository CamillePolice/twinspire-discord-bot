import {
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { RiotApiService } from '../../../../services/riot-games/riot-api.services';
import { 
  createErrorEmbed, 
  createInfoEmbed, 
  StatusIcons, 
  MessageColors 
} from '../../../../helpers/message.helpers';
import { QueueType } from '../../../../enums/queue-type.enums';
import { IParticipant } from '../../../types/riot-games/participant.types';
import { IMatch } from '../../../types/riot-games/match.types';
import { PlatformId } from '@fightmegg/riot-rate-limiter';

// Champion emoji mapping
const championEmojis: Record<string, string> = {
  default: StatusIcons.INFO,
  // Add additional champion mappings as needed
};

export async function handlePlayerHistory(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const summonerName = interaction.options.getString('summoner_name', true);
    const tagLine = interaction.options.getString('tag_line', true);
    const region = interaction.options.getString('region') || PlatformId.EUROPE;
    const count = interaction.options.getInteger('count') || 5;

    const riotApiService = new RiotApiService();

    // Get summoner data
    const summoner = await riotApiService.getSummonerByName(summonerName, tagLine, region);

    if (!summoner) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Summoner Not Found',
            `Could not find summoner **${summonerName}** in region **${region}**.`,
            'Please check the spelling and region.',
          ),
        ],
      });
      return;
    }

    // Get match IDs
    const matchIds = await riotApiService.getMatchIdsByPuuid(summoner.puuid, count, region);

    if (!matchIds || matchIds.length === 0) {
      await interaction.editReply({
        embeds: [
          createInfoEmbed(
            'No Matches Found',
            `No recent matches found for **${summonerName}**.`
          ),
        ],
      });
      return;
    }

    // Create embed
    const embed = createInfoEmbed(
      `${summonerName}'s Match History`,
      `${StatusIcons.INFO} Showing the last ${matchIds.length} matches`
    )
      .setColor(MessageColors.TEAM)
      .setThumbnail(
        `http://ddragon.leagueoflegends.com/cdn/13.12.1/img/profileicon/${summoner.profileIconId}.png`
      )
      .setFooter({
        text: `Region: ${region.toUpperCase()} • Summoner Level: ${summoner.summonerLevel}`,
      });

    // Get details for each match
    for (let i = 0; i < Math.min(matchIds.length, count); i++) {
      try {
        const match = (await riotApiService.getMatchById(matchIds[i], region)) as IMatch;

        if (!match) continue;

        // Find the participant matching our summoner
        const participant = match.info.participants.find(
          (p: IParticipant) => p.puuid === summoner.puuid,
        );

        if (!participant) continue;

        // Determine if it was a win with appropriate icon
        const resultIcon = participant.win ? StatusIcons.SUCCESS : StatusIcons.ERROR;
        const resultText = participant.win ? 'Victory' : 'Defeat';

        // Get queue type
        const queueId = match.info.queueId;
        const queueName = QueueType[queueId as keyof typeof QueueType] || `Queue ${queueId}`;

        // Calculate KDA
        const kills = participant.kills;
        const deaths = participant.deaths;
        const assists = participant.assists;
        const kda = deaths === 0 ? 'Perfect' : ((kills + assists) / deaths).toFixed(2);

        // Format match duration
        const minutes = Math.floor(match.info.gameDuration / 60);
        const seconds = match.info.gameDuration % 60;
        const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Format match time
        const matchDate = new Date(match.info.gameCreation);
        const matchTime = `<t:${Math.floor(matchDate.getTime() / 1000)}:R>`;

        // Get champion emoji
        const championName = participant.championName.toLowerCase();
        const championEmoji = championEmojis[championName] || championEmojis.default;

        // Add field for this match
        embed.addFields({
          name: `${resultIcon} ${resultText} - ${queueName}`,
          value: [
            `${championEmoji} **Champion:** ${participant.championName}`,
            `${StatusIcons.INFO} **KDA:** ${kills}/${deaths}/${assists} (${kda})`,
            `${StatusIcons.STAR} **CS:** ${participant.totalMinionsKilled + participant.neutralMinionsKilled} • **Level:** ${participant.champLevel}`,
            `${StatusIcons.TIME} **Duration:** ${formattedDuration} • **Played:** ${matchTime}`,
            `${StatusIcons.INFO} **Match ID:** \`${matchIds[i]}\``,
          ].join('\n'),
          inline: false,
        });
      } catch (error) {
        logger.error(`Error fetching match ${matchIds[i]}:`, error);
        continue;
      }
    }
    
    // Create a button to view the player's op.gg
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('View on OP.GG')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.op.gg/summoners/euw/${summonerName + '-' + tagLine}`),
    );

    // Check if we have at least one match to display
    if (embed.data.fields && embed.data.fields.length > 0) {
      await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Error Fetching Matches',
            'Could not fetch match details.',
            'This could be due to Riot API issues or rate limiting.',
          ),
        ],
      });
    }
  } catch (error) {
    logger.error('Error fetching player match history:', error);

    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Error Fetching History',
          'An error occurred while fetching match history.',
          'This could be due to Riot API issues or rate limiting.',
        ),
      ],
    });
  }
}