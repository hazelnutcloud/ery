import { AgentTool, type AgentExecutionContext, type ToolResult } from '../../base/AgentTool';
import { logger } from '../../../utils/logger';

export class BanMemberTool extends AgentTool {
  constructor() {
    super(
      'ban_member',
      'Ban a member from the server',
      [
        {
          name: 'userId',
          type: 'user',
          description: 'The Discord user ID of the member to ban',
          required: true,
        },
        {
          name: 'reason',
          type: 'string',
          description: 'The reason for the ban',
          required: true,
        },
        {
          name: 'deleteMessageDays',
          type: 'number',
          description: 'Number of days of messages to delete (0-7)',
          required: false,
        },
      ],
      {
        botPermissions: ['BanMembers'],
        allowInDMs: false,
      }
    );
  }

  async execute(context: AgentExecutionContext, parameters: Record<string, any>): Promise<ToolResult> {
    try {
      const { userId, reason, deleteMessageDays = 0 } = parameters;

      if (!context.guild) {
        return {
          success: false,
          error: 'This command can only be used in a server',
        };
      }

      // Validate deleteMessageDays
      const messageDays = Math.max(0, Math.min(7, parseInt(deleteMessageDays) || 0));

      // Validate reason
      if (!reason || reason.trim().length === 0) {
        return {
          success: false,
          error: 'Ban reason cannot be empty',
        };
      }

      if (reason.length > 512) {
        return {
          success: false,
          error: 'Ban reason cannot exceed 512 characters',
        };
      }

      // Agent cannot ban itself
      if (userId === context.botMember?.id) {
        return {
          success: false,
          error: 'Agent cannot ban itself',
        };
      }

      // Try to fetch the member first
      let targetMember;
      try {
        targetMember = await context.guild.members.fetch(userId);
      } catch (error) {
        // User might not be in the server, try to ban by ID anyway
        logger.debug(`Could not fetch member ${userId}, attempting to ban by ID`);
      }

      // Check if bot can ban this member (role hierarchy)
      if (targetMember && context.botMember) {
        if (targetMember.roles.highest.position >= context.botMember.roles.highest.position) {
          return {
            success: false,
            error: 'Cannot ban member with equal or higher roles than bot',
          };
        }

        // Check if target is server owner
        if (targetMember.id === context.guild.ownerId) {
          return {
            success: false,
            error: 'Cannot ban the server owner',
          };
        }
      }

      // Perform the ban
      await context.guild.members.ban(userId, {
        reason: `${reason} | Autonomous moderation action`,
        deleteMessageSeconds: messageDays * 24 * 60 * 60, // Convert days to seconds
      });

      const username = targetMember?.user.tag || `User ID: ${userId}`;
      logger.info(`Member banned by agent: ${username} from guild ${context.guild.name}. Reason: ${reason}`);

      return {
        success: true,
        data: {
          userId,
          username,
          reason,
          deleteMessageDays: messageDays,
          bannedBy: 'Agent',
          bannedAt: new Date().toISOString(),
          threadId: context.threadId,
        },
        message: `Successfully banned ${username}`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('BanMemberTool execution failed:', error);
      
      // Handle specific Discord errors
      if (errorMessage.includes('Missing Permissions')) {
        return {
          success: false,
          error: 'I do not have permission to ban members',
        };
      }
      
      if (errorMessage.includes('Unknown User')) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: false,
        error: `Failed to ban member: ${errorMessage}`,
      };
    }
  }
}
