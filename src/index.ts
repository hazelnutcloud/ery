import { client } from './bot/client';
import { initializeDatabase, closeDatabase } from './database/connection';
import { validateConfig } from './config';
import { logger } from './utils/logger';
import { messageManager } from './taskThreads/messageManager';
import { registerAllTools } from './tools';

// Import event handlers
import { handleReady } from './events/ready';
import { handleMessageCreate } from './events/messageCreate';

async function main() {
  try {
    logger.info('Starting Ery Discord Bot...');

    // Validate configuration
    validateConfig();

    // Initialize database
    await initializeDatabase();

    // Register all tools
    registerAllTools();

    // Register event handlers
    client.once('ready', () => handleReady(client));
    client.on('messageCreate', handleMessageCreate);

    // Login to Discord
    await client.login(process.env.DISCORD_BOT_TOKEN);

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  logger.info('Shutting down gracefully...');
  
  // Shutdown message manager (stops cleanup intervals and clears listeners)
  messageManager.shutdown();
  
  // Disconnect from Discord
  client.destroy();
  
  // Close database connection
  closeDatabase();
  
  process.exit(0);
}

// Start the bot
main();
