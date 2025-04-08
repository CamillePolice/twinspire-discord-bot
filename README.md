# Twinspire Discord Bot

A Discord bot project for the Twinspire e-sport club, built with TypeScript and Discord.js.

## Features

- Modern Discord bot architecture using Discord.js v14
- Slash commands support
- TypeScript for type safety
- Jest for testing
- Containerized development environment with VS Code devcontainers

## Prerequisites

To work with this project, you'll need:

- [Docker](https://www.docker.com/products/docker-desktop/) installed on your machine
- [Visual Studio Code](https://code.visualstudio.com/) with the [Remote Development extension pack](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack)
- A Discord Bot token (see [Setting Up a Discord Bot](#setting-up-a-discord-bot) below)

## Getting Started

### Setting Up a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under the "TOKEN" section, click "Reset Token" and copy your token
5. Enable the following "Privileged Gateway Intents":
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
6. Go to the "OAuth2" > "URL Generator" tab
7. Select the following scopes:
   - `bot`
   - `applications.commands`
8. Select the following bot permissions:
   - "Send Messages"
   - "Use Slash Commands"
   - Any other permissions your bot will need
9. Copy the generated URL and open it in your browser to add the bot to your server

### Environment Configuration

1. Create a `.env` file in the project root (copy from `.env.example`):

   ```
   # Discord bot token (required)
   DISCORD_TOKEN=your_token_here

   # Discord Application ID (required)
   APPLICATION_ID=your_application_id

   # Discord Guild ID (optional, for development)
   GUILD_ID=your_guild_id

   # Environment
   NODE_ENV=development

   # Debug mode (optional)
   DEBUG=false

   # Bot prefix for legacy text commands (optional)
   PREFIX=!
   ```

2. Replace `your_token_here` with your bot token and `your_application_id` with your application ID (found in the General Information tab of your Discord application).

### Running in a Devcontainer

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/twinspire-discord-bot.git
   cd twinspire-discord-bot
   ```

2. Open the project in VS Code:

   ```bash
   code .
   ```

3. When prompted, click "Reopen in Container" or run the command:

   ```
   Remote-Containers: Reopen in Container
   ```

   from the command palette (F1 or Ctrl+Shift+P)

4. VS Code will build the container and install all dependencies. This might take a few minutes the first time.

5. Once inside the container, you can run the bot using:
   ```bash
   npm run dev
   ```

## Project Structure

```
.
├── .devcontainer/         # Development container configuration
├── src/                   # Source code
│   ├── index.ts           # Main bot entry point
│   ├── commands/          # Command modules
│   │   └── ping.ts        # Example ping command
│   └── ...
├── .env                   # Environment variables (create from .env.example)
├── .env.example           # Example environment variables
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## Available Scripts

- `npm run dev` - Start the bot in development mode with hot-reloading
- `npm run build` - Build the TypeScript project
- `npm run start` - Start the bot from the built files
- `npm run lint` - Run ESLint to check for code style issues
- `npm run format` - Format code using Prettier
- `npm test` - Run Jest tests
- `npm run test:cov` - Run tests with coverage report

### Using VS Code Tasks

This project includes predefined VS Code tasks that make it easier to run common operations. To use them:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the command palette
2. Type "Tasks: Run Task" and select it
3. Choose one of the following tasks:

- **Start Dev Server** - Run the bot in development mode
- **Build Project** - Compile the TypeScript code
- **Run Tests with Coverage (Full)** - Run all tests with detailed coverage
- **Run Tests with Coverage (Simple)** - Run tests with a simplified coverage report

You can also:

- Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on macOS) to run the default build task
- Press `Ctrl+Shift+P` > "Tasks: Run Test Task" to run the default test task

Tasks are defined in the `.vscode/tasks.json` file and can be customized as needed.

## Adding Commands

1. Create a new file in the `src/commands` directory (use `ping.ts` as a template)
2. Export a command object with `data` (using SlashCommandBuilder) and an `execute` function
3. The command will be automatically loaded and registered when the bot starts

Example command:

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Command } from './index';

const myCommand: Command = {
  data: new SlashCommandBuilder().setName('mycommand').setDescription('Description of my command'),

  async execute(interaction) {
    await interaction.reply('Command response here');
  },
};

export default myCommand;
```

## Testing

The project uses Jest for testing. Test files should be named with `.test.ts` suffix.

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov
```

## Deployment

For production deployment:

1. Build the project:

   ```bash
   npm run build
   ```

2. Set environment variables for production:

   ```
   NODE_ENV=production
   DISCORD_TOKEN=your_token
   APPLICATION_ID=your_app_id
   ```

3. Start the bot:
   ```bash
   npm run start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
