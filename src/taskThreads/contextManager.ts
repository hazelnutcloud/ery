import { Message, TextChannel, Collection } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { TaskThreadContext } from './types';

export class ContextManager {
  /**
   * Fetch message context for a task thread
   */
  async fetchContext(triggerMessage: Message): Promise<TaskThreadContext> {
    try {
      const channel = triggerMessage.channel as TextChannel;
      const { contextMessageLimit, contextTimeframeMinutes } = config.taskThread;
      
      // Calculate time window
      const timeframe = contextTimeframeMinutes * 60 * 1000; // Convert to milliseconds
      const oldestAllowedTime = Date.now() - timeframe;
      
      // Fetch messages
      const messages = await this.fetchRecentMessages(
        channel,
        triggerMessage.id,
        contextMessageLimit,
        oldestAllowedTime
      );
      
      // Include trigger message if not already included
      if (!messages.some(m => m.id === triggerMessage.id)) {
        messages.push(triggerMessage);
      }
      
      // Sort messages by timestamp (oldest first)
      messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      
      return {
        messages,
        channelId: channel.id,
        guildId: channel.guild.id,
        triggerMessage,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to fetch context:', error);
      throw error;
    }
  }
  
  /**
   * Fetch recent messages from a channel
   */
  private async fetchRecentMessages(
    channel: TextChannel,
    beforeMessageId: string,
    limit: number,
    oldestAllowedTime: number
  ): Promise<Message[]> {
    const messages: Message[] = [];
    let lastId = beforeMessageId;
    
    while (messages.length < limit) {
      const batch = await channel.messages.fetch({
        before: lastId,
        limit: Math.min(100, limit - messages.length),
      });
      
      if (batch.size === 0) break;
      
      // Filter messages by time and add to results
      for (const message of batch.values()) {
        if (message.createdTimestamp >= oldestAllowedTime) {
          messages.push(message);
          if (messages.length >= limit) break;
        } else {
          // We've reached messages older than our timeframe
          return messages;
        }
      }
      
      lastId = batch.last()?.id || lastId;
    }
    
    return messages;
  }
  
  /**
   * Format context for AI consumption
   */
  formatContextForAI(context: TaskThreadContext): string {
    const messages = context.messages.map(msg => {
      const author = msg.author.bot ? `[BOT] ${msg.author.username}` : msg.author.username;
      const timestamp = new Date(msg.createdTimestamp).toISOString();
      const content = msg.content || '[No text content]';
      const attachments = msg.attachments.size > 0 
        ? `\n[Attachments: ${msg.attachments.map(a => a.name).join(', ')}]` 
        : '';
      
      return `[${timestamp}] ${author}: ${content}${attachments}`;
    }).join('\n');
    
    const channelName = 'name' in context.triggerMessage.channel 
      ? context.triggerMessage.channel.name 
      : 'DM Channel';
    
    return `Channel: #${channelName}
Server: ${context.triggerMessage.guild?.name || 'Direct Message'}
Trigger Message ID: ${context.triggerMessage.id}
Context Timestamp: ${context.timestamp.toISOString()}

Recent Messages:
${messages}`;
  }
  
  /**
   * Extract relevant metadata from context
   */
  extractMetadata(context: TaskThreadContext): Record<string, any> {
    const userIds = new Set(context.messages.map(m => m.author.id));
    const hasAttachments = context.messages.some(m => m.attachments.size > 0);
    const hasMentions = context.messages.some(m => m.mentions.users.size > 0 || m.mentions.roles.size > 0);
    const hasLinks = context.messages.some(m => m.content.includes('http'));
    
    return {
      messageCount: context.messages.length,
      uniqueUsers: userIds.size,
      hasAttachments,
      hasMentions,
      hasLinks,
      timeSpanMinutes: this.calculateTimeSpan(context.messages),
    };
  }
  
  /**
   * Calculate time span of messages in minutes
   */
  private calculateTimeSpan(messages: Message[]): number {
    if (messages.length < 2) return 0;
    
    const timestamps = messages.map(m => m.createdTimestamp);
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    
    return Math.round((newest - oldest) / 1000 / 60);
  }
}

export const contextManager = new ContextManager();
