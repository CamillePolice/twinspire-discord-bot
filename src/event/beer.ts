import { Events, Message, TextChannel } from 'discord.js';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;

    // Liste des variantes possibles de "bière"
    const biereVariations = [
      'bière', 'bieres', 'biere', 'bières',
      'Bière', 'Bieres', 'Biere', 'Bières',
      'BIÈRE', 'BIERES', 'BIERE', 'BIÈRES'
    ];

    // Vérifie si le message contient une variante
    if (biereVariations.some(variant => message.content.includes(variant))) {
      if (message.channel instanceof TextChannel) {
        await message.channel.send("@kurofs ! Quelqu'un t'appelle ! Viens vite !");
      }
    }
  },
};
