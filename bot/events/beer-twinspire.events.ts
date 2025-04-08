import { Message, TextChannel } from 'discord.js';

/**
 * Handles the event when a message is created
 *
 * @param message - The message that was created
 * @returns Promise resolving when the message has been processed
 */
export async function messageCreate(message: Message): Promise<void> {
  console.log(`LOG || Message received: ${message.content}`);

  // Ignore bot messages
  if (message.author.bot) return;

  try {
    const biereVariations = ['bière', 'bieres', 'biere', 'bières'];
    const twinspireVariations = ['twinspire'];
    const images = ['./images/supporter_1.png', './images/supporter_2.png'];
    const messageLower = message.content.toLowerCase();

    if (biereVariations.some(variant => messageLower.includes(variant))) {
      if (message.channel instanceof TextChannel) {
        console.log('LOG || "bière" keyword detected, sending callout');
        await message.channel.send("Kuroooo ! Quelqu'un t'appelle ! Viens vite !");
      }
    }

    if (twinspireVariations.some(variant => messageLower.includes(variant))) {
      if (message.channel instanceof TextChannel) {
        const randomImage = images[Math.floor(Math.random() * images.length)];
        console.log('LOG || "twinspire" keyword detected, sending image');
        await message.channel.send({ files: [randomImage] });
      }
    }
  } catch (error) {
    console.error('LOG || Error in messageCreate:', error);
  }
}
