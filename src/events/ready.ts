import { Client } from 'discord.js';
import { logger } from '../utils/logger';

export async function handleReady(client: Client) {
  if (!client.user) return;

  logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guilds`);

  // Set bot presence
  client.user.setPresence({
    activities: [{
      name: 'for messages',
      type: 3, // Watching
    }],
    status: 'online',
  });
}
