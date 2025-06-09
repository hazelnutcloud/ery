import { AgentTool, type AgentExecutionContext, type ToolResult } from '../../base/AgentTool';
import { logger } from '../../../utils/logger';
import { ChannelType } from 'discord.js';

export class DeleteMessageTool extends AgentTool {
  constructor() {
    super(
      'delete_message',
      'Delete a specific message by ID',
      [
        {
          name: 'messageId',
          type: 'string',
          description: 'The Discord message ID to delete',
          required: true,
        },
        {
          name: 'reason',
          type: 'string',
          description: 'The reason for deleting the message',
          required: false,
        },
      ],
      {
        botPermissions: ['ManageMessages'],
        allowInDMs: false,
      }
    );
  }

  async execute(context: AgentExecutionContext, parameters: Record<string, any>): Promise<ToolResult> {
    try {
      const { messageId, reason = 'No reason provided' } = parameters;

      if (!context.guild) {
        return {
          success: false,
          error: 'This command can only be used in a server',
        };
      }

      // Validate message ID format
      if (!/^\d{17,19}$/.test(messageId)) {
        return {
          success: false,
          error: 'Invalid message ID format',
        };
      }

      // Check if channel supports message deletion
      if (context.channel.type === ChannelType.DM) {
        return {
          success: false,
          error: 'Cannot delete messages in DM channels',
        };
      }

      // Try to fetch the message
      let targetMessage;
      try {
        targetMessage = await context.channel.messages.fetch(messageId);
      } catch (error) {
        return {
          success: false,
          error: 'Message not found or has already been deleted',
        };
      }

      // Check if message is too old (Discord has 14-day limit for bulk operations, 
      // but individual deletions have more restrictions based on bot permissions)
      const messageAge = Date.now() - targetMessage.createdTimestamp;
      const fourteenDays = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

      if (messageAge > fourteenDays && !targetMessage.author.bot && targetMessage.author.id !== context.botMember?.id) {
        // Only warn for very old messages, don't block deletion
        logger.warn(`Attempting to delete old message (${Math.floor(messageAge / (24 * 60 * 60 * 1000))} days old)`);
      }

      // Agent operates with bot permissions - no additional permission checks needed
      // Bot should already have ManageMessages permission as validated by AgentTool framework

      // Store message info before deletion
      const messageInfo = {
        id: targetMessage.id,
        content: targetMessage.content,
        author: {
          id: targetMessage.author.id,
          tag: targetMessage.author.tag,
        },
        createdAt: targetMessage.createdAt.toISOString(),
        channelId: targetMessage.channel.id,
      };

      // Perform the deletion
      await targetMessage.delete();

      logger.info(`Message deleted by agent: ${messageId} in channel ${context.channel.id}. Reason: ${reason}`);

      return {
        success: true,
        data: {
          deletedMessage: messageInfo,
          reason,
          deletedBy: 'Agent',
          deletedAt: new Date().toISOString(),
          threadId: context.threadId,
        },
        message: `Successfully deleted message from ${messageInfo.author.tag}`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('DeleteMessageTool execution failed:', error);
      
      // Handle specific Discord errors
      if (errorMessage.includes('Missing Permissions')) {
        return {
          success: false,
          error: 'I do not have permission to delete messages',
        };
      }
      
      if (errorMessage.includes('Unknown Message')) {
        return {
          success: false,
          error: 'Message not found or has already been deleted',
        };
      }

      if (errorMessage.includes('Cannot delete a message')) {
        return {
          success: false,
          error: 'Cannot delete this message (it may be too old or system message)',
        };
      }

      return {
        success: false,
        error: `Failed to delete message: ${errorMessage}`,
      };
    }
  }
}
