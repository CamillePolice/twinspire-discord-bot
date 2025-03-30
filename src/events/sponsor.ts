import { Events, Message, TextChannel, AttachmentBuilder } from 'discord.js';
import path from 'path';
import fs from 'fs';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    console.log("La fonction execute a été appelée."); // DEBUG

    if (message.author.bot) {
      console.log("Message ignoré car il provient d'un bot."); // DEBUG
      return;
    }

    console.log(`Message reçu: "${message.content}"`); // DEBUG

    const twinspireVariations = ['twinspire'];

    if (twinspireVariations.some(variant => message.content.toLowerCase().includes(variant))) {
      console.log("Mot-clé détecté !");
      console.log("Mot-clé détecté ! Sélection d'une image..."); // DEBUG

      // Sélection aléatoire d'une image
      const sponsorImages = [
        path.join(__dirname, '../../images/supporter_1.png'),
        path.join(__dirname, '../../images/supporter_2.png')
      ];
      const randomImage = sponsorImages[Math.floor(Math.random() * sponsorImages.length)];

      // Vérifie si l'image existe avant de l'envoyer
      if (!fs.existsSync(randomImage)) {
        console.error(`Fichier introuvable : ${randomImage}`);
        return;
      }

      console.log(`Envoi de l'image : ${randomImage}`); // DEBUG

      if (message.channel instanceof TextChannel) {
        const attachment = new AttachmentBuilder(randomImage);
        await message.channel.send({ content: "Voici notre sponsor du jour !", files: [attachment] });
      }
    } else {
      console.log("Mot-clé non détecté.");
    }
  },
};
