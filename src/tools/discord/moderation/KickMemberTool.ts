import { AgentTool, type AgentExecutionContext, type ToolResult } from '../../base/AgentTool';
import { logger } from '../../../utils/logger';

export class KickMemberTool extends AgentTool {
  constructor() {
    super(
      'kick_member',
      'Autonomously kick a member from the server when appropriate moderation action is needed',
      [
        {
          name: 'userId',
          type: 'user',
          description: 'The Discord user ID of the member to kick',
          required: true,
        },
        {
          name: 'reason',
          type: 'string',
          description: 'The reason for the kick (for audit log)',
          required: true,
        },
      ],
      {
        botPermissions: ['KickMembers'],
        allowInDMs: false,
      }
    );
  }

  async execute(context: AgentExecutionContext, parameters: Record<string, any>): Promise<ToolResult> {
    try {
      const { userId, reason } = parameters;

      if (!context.guild) {
        return {
          success: false,
          error: 'Guild context required for member kick',
        };
      }

      // Validate reason
      if (!reason || reason.trim().length === 0) {
        return {
          success: false,
          error: 'Kick reason cannot be empty',
        };
      }

      if (reason.length > 512) {
        return {
          success: false,
          error: 'Kick reason cannot exceed 512 characters',
        };
      }

      // Agent cannot kick itself
      if (userId === context.botMember?.id) {
        return {
          success: false,
          error: 'Agent cannot kick itself',
        };
      }

      // Try to fetch the target member
      let targetMember;
      try {
        targetMember = await context.guild.members.fetch(userId);
      } catch (error) {
        return {
          success: false,
          error: 'Member not found in this server',
        };
      }

      // Check if bot can kick this member (role hierarchy)
      if (context.botMember && targetMember.roles.highest.position >= context.botMember.roles.highest.position) {
        return {
          success: false,
          error: 'Cannot kick member with equal or higher roles than bot',
        };
      }

      // Cannot kick server owner
      if (targetMember.id === context.guild.ownerId) {
        return {
          success: false,
          error: 'Cannot kick the server owner',
        };
      }

      // Perform the kick
      await targetMember.kick(`${reason} | Autonomous moderation action`);

      const username = targetMember.user.tag;
      logger.info(`Member kicked by agent: ${username} from guild ${context.guild.name}. Reason: ${reason}`);

      return {
        success: true,
        data: {
          userId,
          username,
          reason,
          kickedBy: 'Agent',
          kickedAt: new Date().toISOString(),
          batchId: context.batchInfo.id,
        },
        message: `Successfully kicked ${username}`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('KickMemberTool execution failed:', error);
      
      // Handle specific Discord errors
      if (errorMessage.includes('Missing Permissions')) {
        return {
          success: false,
          error: 'Bot lacks permission to kick members',
        };
      }
      
      if (errorMessage.includes('Unknown Member')) {
        return {
          success: false,
          error: 'Member not found',
        };
      }

      return {
        success: false,
        error: `Failed to kick member: ${errorMessage}`,
      };
    }
  }
}
