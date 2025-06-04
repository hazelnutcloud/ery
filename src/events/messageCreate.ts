import { Message } from 'discord.js';
import { taskThreadManager } from '../taskThreads/manager';
import { logger } from '../utils/logger';

export async function handleMessageCreate(message: Message) {
  // Ignore bot messages
  if (message.author.bot) return;

  // Ignore DMs for now (can be enabled later)
  if (!message.guild) return;

  try {
    // Check if guild has reached thread limit
    const hasReachedLimit = await taskThreadManager.hasReachedThreadLimit(message.guild.id);
    if (hasReachedLimit) {
      logger.warn(`Guild ${message.guild.id} has reached task thread limit`);
      return;
    }

    // Create or get active thread for this channel
    const thread = await taskThreadManager.createThread(message);
    
    // Process the thread (this will be handled by the AI processor)
    // For now, just log that we created/got a thread
    logger.debug(`Processing message in thread ${thread.id}`);
    
    // TODO: Implement AI processing and tool execution
    // This is where we'll integrate the AI agent to process the context
    // and determine what actions to take
    
  } catch (error) {
    logger.error('Error handling message create:', error);
  }
}
