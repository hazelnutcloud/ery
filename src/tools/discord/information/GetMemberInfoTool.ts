import { AgentTool, type AgentExecutionContext, type ToolResult } from '../../base/AgentTool';
import { logger } from '../../../utils/logger';

export class GetMemberInfoTool extends AgentTool {
  constructor() {
    super(
      'get_member_info',
      'Bot autonomously gathers detailed information about a server member for context analysis',
      [
        {
          name: 'userId',
          type: 'user',
          description: 'The Discord user ID to get information about',
          required: true,
        },
      ],
      {
        botPermissions: ['ViewChannel'],
        allowInDMs: false,
      }
    );
  }

  async execute(context: AgentExecutionContext, parameters: Record<string, any>): Promise<ToolResult> {
    try {
      const { userId } = parameters;

      const guild = context.guild!; // Safe because requiresGuild is true

      // Validate user ID format
      if (!/^\d{17,19}$/.test(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format',
        };
      }

      // Try to fetch the member
      let targetMember;
      try {
        targetMember = await guild.members.fetch(userId);
      } catch (error) {
        // If member not found in guild, try to get user info
        try {
          const user = await guild.client.users.fetch(userId);
          return {
            success: true,
            data: {
              user: {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                globalName: user.globalName,
                tag: user.tag,
                bot: user.bot,
                system: user.system,
                avatar: user.displayAvatarURL({ size: 512 }),
                createdAt: user.createdAt.toISOString(),
                accountAge: this.formatAge(Date.now() - user.createdTimestamp),
              },
              memberStatus: 'Not in server',
              guild: {
                id: guild.id,
                name: guild.name,
              },
            },
            message: `User ${user.tag} is not a member of this server`,
          };
        } catch (userError) {
          return {
            success: false,
            error: 'User not found',
          };
        }
      }

      const user = targetMember.user;
      const joinedAt = targetMember.joinedAt;
      const roles = targetMember.roles.cache
        .filter(role => role.id !== guild.id) // Exclude @everyone
        .sort((a, b) => b.position - a.position)
        .map(role => ({
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
          permissions: role.permissions.toArray(),
        }));

      const permissions = targetMember.permissions.toArray();
      const isOwner = targetMember.id === guild.ownerId;
      const isAdmin = targetMember.permissions.has('Administrator');
      const isModerator = targetMember.permissions.has('ManageMessages') || 
                         targetMember.permissions.has('KickMembers') || 
                         targetMember.permissions.has('BanMembers');

      // Get timeout information
      let timeoutInfo = null;
      if (targetMember.isCommunicationDisabled()) {
        timeoutInfo = {
          isTimedOut: true,
          timeoutUntil: targetMember.communicationDisabledUntil?.toISOString(),
          remainingTime: targetMember.communicationDisabledUntil ? 
            this.formatDuration((targetMember.communicationDisabledUntil.getTime() - Date.now()) / 1000 / 60) : 
            null,
        };
      }

      const memberInfo = {
        user: {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          globalName: user.globalName,
          tag: user.tag,
          bot: user.bot,
          system: user.system,
          avatar: user.displayAvatarURL({ size: 512 }),
          createdAt: user.createdAt.toISOString(),
          accountAge: this.formatAge(Date.now() - user.createdTimestamp),
        },
        member: {
          nickname: targetMember.nickname,
          displayName: targetMember.displayName,
          joinedAt: joinedAt?.toISOString(),
          serverAge: joinedAt ? this.formatAge(Date.now() - joinedAt.getTime()) : null,
          premiumSince: targetMember.premiumSince?.toISOString(),
          voice: {
            channelId: targetMember.voice.channelId,
            muted: targetMember.voice.mute,
            deafened: targetMember.voice.deaf,
            streaming: targetMember.voice.streaming,
            selfMuted: targetMember.voice.selfMute,
            selfDeafened: targetMember.voice.selfDeaf,
          },
          timeout: timeoutInfo,
          manageable: targetMember.manageable,
          kickable: targetMember.kickable,
          bannable: targetMember.bannable,
          moderatable: targetMember.moderatable,
        },
        roles: {
          count: roles.length,
          highest: roles[0] ? {
            id: roles[0].id,
            name: roles[0].name,
            color: roles[0].color,
            position: roles[0].position,
          } : null,
          list: roles,
        },
        permissions: {
          isOwner,
          isAdmin,
          isModerator,
          list: permissions,
        },
        guild: {
          id: guild.id,
          name: guild.name,
        },
      };

      logger.info(`Member info retrieved for ${user.tag} (${userId}) by agent (thread: ${context.threadId})`);

      return {
        success: true,
        data: memberInfo,
        message: `Retrieved information for ${targetMember.displayName}`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GetMemberInfoTool execution failed:', error);
      
      // Handle specific Discord errors
      if (errorMessage.includes('Missing Permissions')) {
        return {
          success: false,
          error: 'I do not have permission to view member information',
        };
      }

      return {
        success: false,
        error: `Failed to get member info: ${errorMessage}`,
      };
    }
  }

  /**
   * Format age in milliseconds to a human-readable string
   */
  private formatAge(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
      return `${years} year${years === 1 ? '' : 's'} ago`;
    } else if (months > 0) {
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Format duration in minutes to a human-readable string
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.floor(minutes)} minute${Math.floor(minutes) === 1 ? '' : 's'}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    
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
