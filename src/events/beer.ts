import { Events, Message, TextChannel } from 'discord.js';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    console.log(`Message reçu: ${message.content}`); // DEBUG

    if (message.author.bot) return;

    const biereVariations = [
      'bière', 'bieres', 'biere', 'bières',
      'Bière', 'Bieres', 'Biere', 'Bières',
      'BIÈRE', 'BIERES', 'BIERE', 'BIÈRES'
    ];

    if (biereVariations.some(variant => message.content.includes(variant))) {
      if (message.channel instanceof TextChannel) {
        console.log("Message détecté, réponse envoyée !"); // DEBUG
        await message.channel.send("Kuroooo ! Quelqu'un t'appelle ! Viens vite !");
      }
    }
  },
};
