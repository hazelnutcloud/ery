import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Discord client with required intents
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
});

// Bot initialization
export async function initializeBot() {
  try {
    logger.info('Initializing Discord bot...');
    
    // Login to Discord
    await client.login(config.discord.token);
    
    logger.info(`Bot logged in as ${client.user?.tag}`);
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    throw error;
  }
}

// Graceful shutdown
export async function shutdownBot() {
  logger.info('Shutting down bot...');
  client.destroy();
}
