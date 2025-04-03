import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

config(); // Charge les variables d'environnement depuis un fichier .env

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const IMAGE_PATH = '../../images/supporter_1.png';

client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content.toLowerCase() === 'twinspire') {
        await message.channel.send({ files: [IMAGE_PATH] });
    }
});

client.login(process.env.TOKEN);
