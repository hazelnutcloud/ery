import { AgentTool, type AgentExecutionContext, type ToolResult } from '../../base/AgentTool';
import { logger } from '../../../utils/logger';

export class TimeoutMemberTool extends AgentTool {
  constructor() {
    super(
      'timeout_member',
      'Timeout (temporarily mute) a member for a specified duration',
      [
        {
          name: 'userId',
          type: 'user',
          description: 'The Discord user ID of the member to timeout',
          required: true,
        },
        {
          name: 'duration',
          type: 'number',
          description: 'Duration in minutes (1-40320, max 28 days)',
          required: true,
        },
        {
          name: 'reason',
          type: 'string',
          description: 'The reason for the timeout',
          required: true,
        },
      ],
      {
        botPermissions: ['ModerateMembers'],
        allowInDMs: false,
      }
    );
  }

  async execute(context: AgentExecutionContext, parameters: Record<string, any>): Promise<ToolResult> {
    try {
      const { userId, duration, reason } = parameters;

      if (!context.guild) {
        return {
          success: false,
          error: 'This command can only be used in a server',
        };
      }

      // Validate duration (1 minute to 28 days)
      const durationMinutes = parseInt(duration);
      if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 40320) {
        return {
          success: false,
          error: 'Duration must be between 1 minute and 40320 minutes (28 days)',
        };
      }

      // Validate reason
      if (!reason || reason.trim().length === 0) {
        return {
          success: false,
          error: 'Timeout reason cannot be empty',
        };
      }

      if (reason.length > 512) {
        return {
          success: false,
          error: 'Timeout reason cannot exceed 512 characters',
        };
      }

      // Agent cannot timeout itself
      if (userId === context.botMember?.id) {
        return {
          success: false,
          error: 'Agent cannot timeout itself',
        };
      }

      // Try to fetch the member
      let targetMember;
      try {
        targetMember = await context.guild.members.fetch(userId);
      } catch (error) {
        return {
          success: false,
          error: 'Member not found in this server',
        };
      }

      // Check if bot can timeout this member (role hierarchy)
      if (context.botMember && targetMember.roles.highest.position >= context.botMember.roles.highest.position) {
        return {
          success: false,
          error: 'Cannot timeout member with equal or higher roles than bot',
        };
      }

      // Check if target is server owner
      if (targetMember.id === context.guild.ownerId) {
        return {
          success: false,
          error: 'Cannot timeout the server owner',
        };
      }

      // Check if member is already timed out
      if (targetMember.isCommunicationDisabled()) {
        return {
          success: false,
          error: 'Member is already timed out',
        };
      }

      // Calculate timeout end time
      const timeoutUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

      // Perform the timeout
      await targetMember.timeout(
        durationMinutes * 60 * 1000, // Convert minutes to milliseconds
        `${reason} | Autonomous moderation action`
      );

      const username = targetMember.user.tag;
      const durationText = this.formatDuration(durationMinutes);
      
      logger.info(`Member timed out by agent: ${username} in guild ${context.guild.name} for ${durationText}. Reason: ${reason}`);

      return {
        success: true,
        data: {
          userId,
          username,
          reason,
          durationMinutes,
          durationText,
          timeoutUntil: timeoutUntil.toISOString(),
          timedOutBy: 'Agent',
          timedOutAt: new Date().toISOString(),
          batchId: context.batchInfo.id,
        },
        message: `Successfully timed out ${username} for ${durationText}`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('TimeoutMemberTool execution failed:', error);
      
      // Handle specific Discord errors
      if (errorMessage.includes('Missing Permissions')) {
        return {
          success: false,
          error: 'I do not have permission to timeout members',
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
        error: `Failed to timeout member: ${errorMessage}`,
      };
    }
  }

  /**
   * Format duration in minutes to a human-readable string
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      let result = `${hours} hour${hours === 1 ? '' : 's'}`;
      if (remainingMinutes > 0) {
        result += ` and ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
      }
      return result;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    let result = `${days} day${days === 1 ? '' : 's'}`;
    if (remainingHours > 0) {
      result += ` and ${remainingHours} hour${remainingHours === 1 ? '' : 's'}`;
    }
    return result;
  }
}
