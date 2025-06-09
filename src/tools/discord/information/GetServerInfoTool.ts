import { AgentTool, type AgentExecutionContext, type ToolResult } from '../../base/AgentTool';
import { logger } from '../../../utils/logger';
import { ChannelType } from 'discord.js';

export class GetServerInfoTool extends AgentTool {
  constructor() {
    super(
      'get_server_info',
      'Bot autonomously gathers detailed information about the current server for context analysis',
      [],
      {
        botPermissions: ['ViewChannel'],
        allowInDMs: false,
      }
    );
  }

  override async validateExecution(context: AgentExecutionContext): Promise<{ canExecute: boolean; reason?: string }> {
    // Use base validation
    const baseValidation = await super.validateExecution(context);
    if (!baseValidation.canExecute) {
      return baseValidation;
    }

    // Additional validation - ensure we have guild context
    if (!context.guild) {
      return {
        canExecute: false,
        reason: 'Server information requires guild context',
      };
    }

    return { canExecute: true };
  }

  async execute(context: AgentExecutionContext, parameters: Record<string, any>): Promise<ToolResult> {
    try {
      const guild = context.guild!; // Safe because validateExecution checks this

      // Fetch guild owner
      let owner;
      try {
        owner = await guild.fetchOwner();
      } catch (error) {
        owner = null;
      }

      // Channel statistics
      const channels = guild.channels.cache;
      const channelStats = {
        total: channels.size,
        text: channels.filter(c => c.type === ChannelType.GuildText).size,
        voice: channels.filter(c => c.type === ChannelType.GuildVoice).size,
        category: channels.filter(c => c.type === ChannelType.GuildCategory).size,
        stage: channels.filter(c => c.type === ChannelType.GuildStageVoice).size,
        news: channels.filter(c => c.type === ChannelType.GuildNews).size,
        forum: channels.filter(c => c.type === ChannelType.GuildForum).size,
        thread: channels.filter(c => 
          c.type === ChannelType.PublicThread || 
          c.type === ChannelType.PrivateThread
        ).size,
      };

      // Role statistics
      const roles = guild.roles.cache;
      const roleStats = {
        total: roles.size,
        hoisted: roles.filter(r => r.hoist).size,
        mentionable: roles.filter(r => r.mentionable).size,
        managed: roles.filter(r => r.managed).size,
      };

      // Member statistics
      const members = guild.members.cache;
      const memberStats = {
        total: guild.memberCount,
        cached: members.size,
        humans: members.filter(m => !m.user.bot).size,
        bots: members.filter(m => m.user.bot).size,
        online: members.filter(m => m.presence?.status === 'online').size,
        idle: members.filter(m => m.presence?.status === 'idle').size,
        dnd: members.filter(m => m.presence?.status === 'dnd').size,
        offline: members.filter(m => !m.presence || m.presence.status === 'offline').size,
      };

      // Emoji statistics
      const emojis = guild.emojis.cache;
      const emojiStats = {
        total: emojis.size,
        static: emojis.filter(e => !e.animated).size,
        animated: emojis.filter(e => e.animated).size,
        managed: emojis.filter(e => e.managed).size,
      };

      // Sticker statistics
      const stickers = guild.stickers.cache;
      const stickerStats = {
        total: stickers.size,
      };

      // Server features
      const features = guild.features || [];

      // Security and moderation info
      const security = {
        verificationLevel: guild.verificationLevel,
        explicitContentFilter: guild.explicitContentFilter,
        mfaLevel: guild.mfaLevel,
        nsfwLevel: guild.nsfwLevel,
        premiumTier: guild.premiumTier,
        premiumSubscriptionCount: guild.premiumSubscriptionCount,
      };

      // Bot permissions in this guild
      const botMember = guild.members.me;
      const botPermissions = botMember ? botMember.permissions.toArray() : [];

      const serverInfo = {
        basic: {
          id: guild.id,
          name: guild.name,
          description: guild.description,
          icon: guild.iconURL({ size: 512 }),
          banner: guild.bannerURL({ size: 2048 }),
          splash: guild.splashURL({ size: 2048 }),
          discoverySplash: guild.discoverySplashURL({ size: 2048 }),
          vanityURLCode: guild.vanityURLCode,
          preferredLocale: guild.preferredLocale,
          createdAt: guild.createdAt.toISOString(),
          age: this.formatAge(Date.now() - guild.createdTimestamp),
        },
        owner: owner ? {
          id: owner.id,
          tag: owner.user.tag,
          avatar: owner.displayAvatarURL({ size: 256 }),
        } : null,
        statistics: {
          members: memberStats,
          channels: channelStats,
          roles: roleStats,
          emojis: emojiStats,
          stickers: stickerStats,
        },
        security,
        features,
        limits: {
          members: this.getMemberLimit(guild.premiumTier),
          emojis: guild.premiumTier === 0 ? 50 : guild.premiumTier === 1 ? 100 : guild.premiumTier === 2 ? 150 : 250,
          stickers: guild.premiumTier === 0 ? 5 : guild.premiumTier === 1 ? 15 : guild.premiumTier === 2 ? 30 : 60,
          fileSize: guild.premiumTier === 0 ? 8 : guild.premiumTier === 1 ? 8 : guild.premiumTier === 2 ? 50 : 100, // MB
          bitrate: guild.premiumTier === 0 ? 96 : guild.premiumTier === 1 ? 128 : guild.premiumTier === 2 ? 256 : 384, // kbps
        },
        bot: {
          permissions: botPermissions,
          isAdmin: botMember?.permissions.has('Administrator') || false,
          joinedAt: botMember?.joinedAt?.toISOString(),
          nickname: botMember?.nickname,
        },
      };

      logger.info(`Server info retrieved for ${guild.name} by agent (thread: ${context.threadId})`);

      return {
        success: true,
        data: serverInfo,
        message: `Retrieved information for ${guild.name}`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GetServerInfoTool execution failed:', error);
      
      // Handle specific Discord errors
      if (errorMessage.includes('Missing Permissions')) {
        return {
          success: false,
          error: 'I do not have permission to view server information',
        };
      }

      return {
        success: false,
        error: `Failed to get server info: ${errorMessage}`,
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
      return `${years} year${years === 1 ? '' : 's'}`;
    } else if (months > 0) {
      return `${months} month${months === 1 ? '' : 's'}`;
    } else if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'}`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    } else {
      return 'Just created';
    }
  }

  /**
   * Get member limit based on premium tier
   */
  private getMemberLimit(premiumTier: number): number {
    switch (premiumTier) {
      case 0: return 500000; // Regular servers
      case 1: return 500000; // Tier 1
      case 2: return 500000; // Tier 2  
      case 3: return 500000; // Tier 3
      default: return 500000;
    }
  }
}
