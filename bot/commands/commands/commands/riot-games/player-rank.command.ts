import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../../../../utils/logger.utils';
import { RiotApiService } from '../../../../services/riot-games/riot-api.services';
import {
  createErrorEmbed,
  createInfoEmbed,
  StatusIcons,
} from '../../../../helpers/message.helpers';
import { RankColor } from '../../../../enums/rank-color.enums';
import { PlatformId } from '@fightmegg/riot-api';
import { calculateWinRate, formatQueueType, getRankIcon } from '../../../../helpers/riot.helpers';

export async function handlePlayerRank(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const summonerName = interaction.options.getString('summoner_name', true);
    const tagLine = interaction.options.getString('tag_line', true);
    const region = interaction.options.getString('region') || PlatformId.EUROPE;

    const riotApiService = new RiotApiService();

    // Get summoner data
    const summoner = await riotApiService.getSummonerByName(summonerName, tagLine, region);

    if (!summoner) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Summoner Not Found',
            `Could not find summoner **${summonerName}#${tagLine}** in region **${region}**.`,
            'Please check the spelling, tag line, and region.',
          ),
        ],
      });
      return;
    }

    // Get ranked data
    const rankedData = await riotApiService.getRankedInfoBySummonerId(summoner.puuid, region);
    const profileIconUrl = `http://ddragon.leagueoflegends.com/cdn/13.12.1/img/profileicon/${summoner.profileIconId}.png`;

    if (!rankedData || rankedData.length === 0) {
      const unrankedEmbed = createInfoEmbed(
        `${summonerName}#${tagLine}'s Rank`,
        `${StatusIcons.INFO} **${summonerName}** is **Unranked** in all queues.`,
      )
        .setColor(RankColor.UNRANKED)
        .setThumbnail(profileIconUrl)
        .setFooter({ text: `Summoner Level: ${summoner.summonerLevel}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [unrankedEmbed] });
      return;
    }

    // Determine highest solo queue tier for embed color
    const soloQueueData = rankedData.find(queue => queue.queueType === 'RANKED_SOLO_5x5');
    const embedColor = soloQueueData
      ? RankColor[soloQueueData.tier as keyof typeof RankColor] || RankColor.UNRANKED
      : RankColor.UNRANKED;

    // Create embed with ranked info
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`${summonerName}#${tagLine}'s Rank`)
      .setDescription(`${StatusIcons.INFO} Summoner profile for **${summonerName}**`)
      .setThumbnail(profileIconUrl)
      .setFooter({ text: `Summoner Level: ${summoner.summonerLevel} • Region: ${region}` })
      .setTimestamp();

    // Add fields for each queue type
    rankedData.forEach(queueData => {
      const queueName = formatQueueType(queueData.queueType);
      const winRate = calculateWinRate(queueData.wins, queueData.losses);

      const rankDisplay = `${queueData.tier} ${queueData.rank} (${queueData.leaguePoints} LP)`;
      const winLossDisplay = `${queueData.wins}W ${queueData.losses}L (${winRate}% WR)`;

      embed.addFields({
        name: queueName,
        value: [
          `${getRankIcon(queueData.tier)} **Rank:** ${rankDisplay}`,
          `${StatusIcons.INFO} **Record:** ${winLossDisplay}`,
          queueData.hotStreak ? '🔥 **Hot Streak!**' : '',
        ]
          .filter(Boolean)
          .join('\n'),
        inline: true,
      });
    });

    await interaction.editReply({ embeds: [embed] });
    logger.info(`Displayed rank information for ${summonerName}#${tagLine} (${region})`);
  } catch (error) {
    logger.error('Error fetching player rank:', error as Error);

    await interaction.editReply({
      embeds: [
        createErrorEmbed(
          'Error Fetching Rank',
          'An error occurred while fetching rank information.',
          'This could be due to Riot API issues or rate limiting.',
        ),
      ],
    });
  }
}
