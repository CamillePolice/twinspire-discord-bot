import { Events, Message, TextChannel } from 'discord.js';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    console.log(`Message reçu: ${message.content}`); // DEBUG

    if (message.author.bot) return;

    const biereVariations = ['bière', 'bieres', 'biere', 'bières'];
    const twinspireVariations = ['twinspire'];

    const images = ['./images/supporter_1.png', './images/supporter_2.png'];

    const messageLower = message.content.toLowerCase();

    if (biereVariations.some(variant => messageLower.includes(variant))) {
      if (message.channel instanceof TextChannel) {
        console.log("Message détecté, réponse envoyée !"); // DEBUG
        await message.channel.send("Kuroooo ! Quelqu'un t'appelle ! Viens vite !");
      }
    }

    if (twinspireVariations.some(variant => messageLower.includes(variant))) {
      if (message.channel instanceof TextChannel) {
        const randomImage = images[Math.floor(Math.random() * images.length)];
        console.log("Message détecté, envoi de l'image !"); // DEBUG
        await message.channel.send({ files: [randomImage] });
      }
    }
  },
};
