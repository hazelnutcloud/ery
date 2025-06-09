import { Client } from 'discord.js';
import { logger } from '../utils/logger';
import { infoDocCommand } from '../commands/infoDocuments';

export async function handleReady(client: Client) {
  if (!client.user) return;

  logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guilds`);

  // Register application commands
  try {
    logger.info('Registering application commands...');
    await client.application?.commands.set([
      infoDocCommand.data,
    ]);
    logger.info('Successfully registered application commands');
  } catch (error) {
    logger.error('Failed to register application commands:', error);
  }

  // Set bot presence
  client.user.setPresence({
    activities: [{
      name: 'for messages',
      type: 3, // Watching
    }],
    status: 'online',
  });
}
