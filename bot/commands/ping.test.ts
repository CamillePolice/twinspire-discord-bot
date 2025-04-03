import { CommandInteraction, Client } from 'discord.js';
import pingCommand from './ping';

// Correctly mock Discord.js objects
jest.mock('discord.js', () => {
  return {
    SlashCommandBuilder: jest.fn().mockImplementation(() => ({
      setName: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      toJSON: jest.fn().mockReturnValue({ name: 'ping', description: 'Replies with Pong' }),
    })),
    Client: jest.fn(),
  };
});

describe('Ping Command', () => {
  let mockInteraction: CommandInteraction;
  let replyMock: jest.Mock;
  let editReplyMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();

    // Create mock timestamps for latency calculation
    const interactionTimestamp = Date.now();
    const sentTimestamp = interactionTimestamp + 100; // 100ms latency

    // Create mock reply function that returns a message with timestamp
    replyMock = jest.fn().mockResolvedValue({
      createdTimestamp: sentTimestamp,
    });

    // Create mock editReply function
    editReplyMock = jest.fn().mockResolvedValue({});

    // Create mock client with proper typing
    const mockClient = {
      ws: { ping: 50 },
    } as unknown as Client<true>;

    // Create a proper mock for CommandInteraction
    mockInteraction = {
      reply: replyMock,
      editReply: editReplyMock,
      createdTimestamp: interactionTimestamp,
      client: mockClient,
      commandName: 'ping',
      // Add the minimum required properties to satisfy TypeScript
      isChatInputCommand: () => true,
      isButton: () => false,
      isSelectMenu: () => false,
      isContextMenuCommand: () => false,
      isMessageComponent: () => false,
      isModalSubmit: () => false,
      isCommand: () => true,
      isRepliable: () => true,
      // Add any other properties TypeScript complains about
      options: {
        getString: jest.fn(),
        getNumber: jest.fn(),
        getBoolean: jest.fn(),
        getUser: jest.fn(),
        getMember: jest.fn(),
        getChannel: jest.fn(),
        getRole: jest.fn(),
        get: jest.fn(),
      },
      // These are necessary to satisfy the type checker
      inGuild: () => true,
      inCachedGuild: () => true,
      inRawGuild: () => true,
      deferReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
      webhook: {
        id: 'webhook-id',
        token: 'webhook-token',
        send: jest.fn(),
        editMessage: jest.fn(),
        deleteMessage: jest.fn(),
      },
      // Default properties
      id: 'interaction-id',
      applicationId: 'app-id',
      type: 2, // APPLICATION_COMMAND
      channelId: 'channel-id',
      guildId: 'guild-id',
      user: {
        id: 'user-id',
        bot: false,
        system: false,
        username: 'test-user',
        discriminator: '0000',
        avatar: null,
        banner: null,
      },
      token: 'interaction-token',
      version: 1,
      // Add valueOf() to satisfy the error
      valueOf: () => mockInteraction,
    } as unknown as CommandInteraction;
  });

  it('should reply with pong and latency information', async () => {
    // Execute the command
    await pingCommand.execute(mockInteraction);

    // Check that reply was called with the correct message
    expect(replyMock).toHaveBeenCalledWith({ content: 'Pinging...', fetchReply: true });

    // Check that editReply was called with ping information
    expect(editReplyMock).toHaveBeenCalledWith(expect.stringContaining('Pong! 🏓'));

    // Verify latency information is included
    expect(editReplyMock).toHaveBeenCalledWith(expect.stringContaining('Bot Latency: 100ms'));

    // Verify API latency information is included
    expect(editReplyMock).toHaveBeenCalledWith(expect.stringContaining('API Latency: 50ms'));
  });
});
