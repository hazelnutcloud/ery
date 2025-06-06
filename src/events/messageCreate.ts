import { Message } from 'discord.js';
import { messageManager } from '../taskThreads/messageManager';
import { logger } from '../utils/logger';

export async function handleMessageCreate(message: Message) {
  // Ignore bot messages
  if (message.author.bot) return;

  // Ignore DMs for now (can be enabled later)
  if (!message.guild) return;

  try {
    // Add message to the MessageManager - this will handle batching logic
    // The MessageManager coordinates between MessageBatcher and TaskThreadManager using events
    await messageManager.addMessage(message);
    
  } catch (error) {
    logger.error('Error handling message create:', error);
  }
}
