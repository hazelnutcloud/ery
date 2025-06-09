import { AgentTool, type AgentExecutionContext, type ToolResult } from '../../base/AgentTool';
import { logger } from '../../../utils/logger';
import { ChannelType } from 'discord.js';

export class BulkDeleteMessagesTool extends AgentTool {
  constructor() {
    super(
      'bulk_delete_messages',
      'Delete multiple messages at once (up to 100, max 14 days old)',
      [
        {
          name: 'count',
          type: 'number',
          description: 'Number of messages to delete (1-100)',
          required: true,
        },
        {
          name: 'reason',
          type: 'string',
          description: 'The reason for bulk deleting messages',
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
      const { count, reason = 'Bulk cleanup' } = parameters;

      if (!context.guild) {
        return {
          success: false,
          error: 'This command can only be used in a server',
        };
      }

      // Validate count
      const messageCount = parseInt(count);
      if (isNaN(messageCount) || messageCount < 1 || messageCount > 100) {
        return {
          success: false,
          error: 'Count must be between 1 and 100 messages',
        };
      }

      // Check if channel supports bulk message deletion
      if (context.channel.type === ChannelType.DM) {
        return {
          success: false,
          error: 'Cannot bulk delete messages in DM channels',
        };
      }

      // Ensure the channel is text-based and in a guild
      if (!('guild' in context.channel) || !context.channel.guild) {
        return {
          success: false,
          error: 'This command can only be used in guild text channels',
        };
      }

      // Agent operates with bot permissions - no additional permission checks needed
      // Bot should already have ManageMessages permission as validated by AgentTool framework

      // Fetch messages to delete
      let messagesToDelete;
      try {
        messagesToDelete = await context.channel.messages.fetch({ 
          limit: messageCount
        });
      } catch (error) {
        return {
          success: false,
          error: 'Failed to fetch messages for deletion',
        };
      }

      if (messagesToDelete.size === 0) {
        return {
          success: false,
          error: 'No messages found to delete',
        };
      }

      // Filter out messages older than 14 days (Discord API limitation)
      const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const validMessages = messagesToDelete.filter(message => 
        message.createdTimestamp > fourteenDaysAgo
      );

      if (validMessages.size === 0) {
        return {
          success: false,
          error: 'No messages within 14 days found to delete (Discord limitation)',
        };
      }

      // Store message info before deletion for logging
      const deletedMessagesInfo = validMessages.map(message => ({
        id: message.id,
        author: {
          id: message.author.id,
          tag: message.author.tag,
        },
        content: message.content.substring(0, 100), // Truncate for logging
        createdAt: message.createdAt.toISOString(),
      }));

      // Perform bulk deletion
      let deletedMessages;
      try {
        if (validMessages.size === 1) {
          // Use single delete for single message
          await validMessages.first()?.delete();
          deletedMessages = validMessages;
        } else {
          // Use bulk delete for multiple messages
          deletedMessages = await context.channel.bulkDelete(validMessages, true);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('older than 2 weeks')) {
          return {
            success: false,
            error: 'Some messages are older than 14 days and cannot be bulk deleted',
          };
        }
        
        throw error; // Re-throw other errors to be handled by outer catch
      }

      const actualDeletedCount = deletedMessages instanceof Map ? deletedMessages.size : validMessages.size;

      logger.info(`Bulk deleted ${actualDeletedCount} messages in channel ${context.channel.id} by agent. Reason: ${reason}`);

      return {
        success: true,
        data: {
          deletedCount: actualDeletedCount,
          requestedCount: messageCount,
          skippedOldMessages: messagesToDelete.size - validMessages.size,
          deletedMessages: deletedMessagesInfo,
          reason,
          deletedBy: 'Agent',
          deletedAt: new Date().toISOString(),
          channelId: context.channel.id,
          threadId: context.threadId,
        },
        message: `Successfully deleted ${actualDeletedCount} message${actualDeletedCount === 1 ? '' : 's'}${
          messagesToDelete.size > validMessages.size ? 
          ` (${messagesToDelete.size - validMessages.size} old messages skipped)` : 
          ''
        }`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('BulkDeleteMessagesTool execution failed:', error);
      
      // Handle specific Discord errors
      if (errorMessage.includes('Missing Permissions')) {
        return {
          success: false,
          error: 'I do not have permission to delete messages',
        };
      }
      
      if (errorMessage.includes('Cannot delete messages')) {
        return {
          success: false,
          error: 'Cannot delete messages in this channel type',
        };
      }

      if (errorMessage.includes('older than 2 weeks')) {
        return {
          success: false,
          error: 'Cannot bulk delete messages older than 14 days',
        };
      }

      return {
        success: false,
        error: `Failed to bulk delete messages: ${errorMessage}`,
      };
    }
  }
}
