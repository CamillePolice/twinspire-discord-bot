import { Events, Message, TextChannel } from 'discord.js';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    console.log(`Message reçu: ${message.content}`); // DEBUG

    if (message.author.bot) return;

    if (message.content.toLowerCase() === 'twinspire') {
      if (message.channel instanceof TextChannel) {
        console.log("Message détecté, envoi de l'image !"); // DEBUG
        await message.channel.send({ files: ["./images/supporter_1.png"] });
      }
    }
  },
};
