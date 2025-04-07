import {
  MessageReaction,
  User,
  TextChannel,
  PartialMessageReaction,
  PartialUser,
  MessageReactionEventDetails,
} from 'discord.js';
import { logger } from '../utils/logger.utils';
import { ChallengeService } from '../services/tournament/challenge.services';
import { createSuccessEmbed, StatusIcons } from '../helpers/message.helpers';

const challengeService = new ChallengeService();

/**
 * Handles the event when a reaction is added to a message
 *
 * @param reaction - The reaction that was added
 * @param user - The user who added the reaction
 * @param _details - Additional details about the reaction event
 * @returns Promise resolving when the reaction has been processed
 */
export async function messageReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _details: MessageReactionEventDetails,
): Promise<void> {
  console.log(`LOG || Reaction event triggered by user: ${user.tag || user.id}`);
  console.log(`LOG || Reaction emoji: ${reaction.emoji.name}`);
  
  // Ignore bot reactions
  if (user.bot) return;
  
  try {
    // Fetch the full reaction if it's partial
    if (reaction.partial) {
      console.log(`LOG || Fetching partial reaction`);
      await reaction.fetch();
    }

    // Get the message that was reacted to
    const message = reaction.message;
    console.log(`LOG || Message channel: ${message.channel.id}`);
    
    // Only process reactions in guild channels
    if (!message.guild) {
      console.log(`LOG || Message is not in a guild`);
      return;
    }
    
    console.log(`LOG || Guild: ${message.guild.name}`);
    
    // Check if the message is in the "défis" channel
    if (!(message.channel instanceof TextChannel)) {
      console.log(`LOG || Channel is not a TextChannel`);
      return;
    }
    
    console.log(`LOG || Channel name: ${message.channel.name}`);
    
    if (message.channel.name.toLowerCase() !== 'défis') {
      console.log(`LOG || Channel is not "défis"`);
      return;
    }

    // Check if the message has an embed (challenge announcements have embeds)
    if (message.embeds.length === 0) {
      console.log(`LOG || Message has no embeds`);
      return;
    }

    // Get the first embed
    const embed = message.embeds[0];
    console.log(`LOG || Embed title: ${embed.title}`);
    
    // Check if this is a challenge announcement (should have a title with "Challenge:")
    if (!embed.title?.includes('Challenge:')) {
      console.log(`LOG || Embed title does not include "Challenge:"`);
      return;
    }

    // Extract the challenge ID from the title
    const challengeId = embed.title.split('Challenge:')[1].trim();
    console.log(`LOG || Challenge ID: ${challengeId}`);

    // Get the guild member who reacted
    const member = await message.guild.members.fetch(user.id);
    console.log(`LOG || Member roles: ${member.roles.cache.map(r => r.name).join(', ')}`);

    // Check if the user has the "Caster" role
    const hasCasterRole = member.roles.cache.some(role => role.name === 'Caster');
    console.log(`LOG || Has Caster role: ${hasCasterRole}`);

    if (!hasCasterRole) return;

    // Check if the reaction is a positive icon (thumbs up, check mark, etc.)
    const positiveReactions = ['👍', '✅', '🟢', '⭐', '❤️'];
    console.log(`LOG || Reaction emoji name: ${reaction.emoji.name}`);
    if (!positiveReactions.includes(reaction.emoji.name || '')) {
      console.log(`LOG || Reaction is not a positive icon`);
      return;
    }

    // Get the challenge from the database
    const challenge = await challengeService.getChallengeById(challengeId);
    if (!challenge) {
      logger.error(`Challenge ${challengeId} not found for reaction`);
      return;
    }
    console.log(`LOG || Challenge found: ${challengeId}, castDemand: ${challenge.castDemand}`);

    // Check if this is a cast demand challenge
    if (!challenge.castDemand) {
      console.log(`LOG || Challenge is not a cast demand`);
      return;
    }

    // Create a success embed
    const successEmbed = createSuccessEmbed(
      'Caster Assigned',
      `${StatusIcons.SUCCESS} <@${user.id}> has volunteered to cast this challenge!`,
    );

    // Send a message in the same channel
    await message.channel.send({ embeds: [successEmbed] });
    console.log(`LOG || Success message sent`);

    logger.info(`Caster ${user.tag || user.id} volunteered to cast challenge ${challengeId}`);
  } catch (error) {
    logger.error('Error processing message reaction:', error as Error);
    console.error(`LOG || Error:`, error);
  }
}
