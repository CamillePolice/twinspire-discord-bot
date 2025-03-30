import { Events, Message, TextChannel, AttachmentBuilder } from 'discord.js';
import path from 'path';
import fs from 'fs';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    console.log(`Message reçu: ${message.content}`); // DEBUG
    console.log(`Auteur: ${message.author.tag}`); // DEBUG

    if (message.author.bot) return;

    // Liste des images locales
    const sponsorImages = [
      path.join(__dirname, '../../images/supporter_1.png'),
      path.join(__dirname, '../../images/supporter_2.png')
    ];

    // Vérifie si le message contient "twinspire" (insensible à la casse)
    if (message.content.toLowerCase().includes("twinspire")) {
      console.log("Mot-clé détecté ! Sélection d'une image..."); // DEBUG

      // Sélection aléatoire d'une image
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
