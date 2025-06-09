import {
  AgentTool,
  type AgentExecutionContext,
  type ToolResult,
} from "../../base/AgentTool";
import { logger } from "../../../utils/logger";
import { ChannelType } from "discord.js";

export class GetChannelInfoTool extends AgentTool {
  constructor() {
    super(
      "get_channel_info",
      "Bot autonomously gathers detailed information about a specific channel for context analysis",
      [
        {
          name: "channelId",
          type: "channel",
          description:
            "The Discord channel ID to get information about (optional, defaults to current channel)",
          required: false,
        },
      ],
      {
        botPermissions: ["ViewChannel"],
        allowInDMs: false,
      }
    );
  }

  async execute(
    context: AgentExecutionContext,
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    try {
      const guild = context.guild!; // Safe because requiresGuild is true
      const { channelId } = parameters;

      // Use provided channel ID or current channel
      let targetChannel;
      if (channelId) {
        // Validate channel ID format
        if (!/^\d{17,19}$/.test(channelId)) {
          return {
            success: false,
            error: "Invalid channel ID format",
          };
        }

        try {
          targetChannel = await guild.channels.fetch(channelId);
        } catch (error) {
          return {
            success: false,
            error: "Channel not found in this server",
          };
        }
      } else {
        targetChannel = context.channel;
        // Ensure it's a guild channel
        if (!("guild" in targetChannel) || !targetChannel.guild) {
          return {
            success: false,
            error: "Current channel is not a guild channel",
          };
        }
      }

      if (!targetChannel) {
        return {
          success: false,
          error: "Channel not found",
        };
      }

      const channelInfo: any = {
        basic: {
          id: targetChannel.id,
          name: "name" in targetChannel ? targetChannel.name : "Unknown",
          type: targetChannel.type,
          typeString: this.getChannelTypeString(targetChannel.type),
          createdAt: targetChannel.createdAt?.toISOString(),
          age: targetChannel.createdTimestamp
            ? this.formatAge(Date.now() - targetChannel.createdTimestamp)
            : "Unknown",
        },
        guild: {
          id: guild.id,
          name: guild.name,
        },
      };

      // Add type-specific information
      if (targetChannel.type === ChannelType.GuildText) {
        const textChannel = targetChannel;
        channelInfo.text = {
          topic: textChannel.topic,
          nsfw: textChannel.nsfw,
          slowmode: textChannel.rateLimitPerUser,
          position: textChannel.position,
          parentId: textChannel.parentId,
          parentName: textChannel.parent?.name,
        };

        // Get recent message activity
        try {
          const messages = await textChannel.messages.fetch({ limit: 10 });
          channelInfo.activity = {
            recentMessages: messages.size,
            lastMessageAt: messages.first()?.createdAt.toISOString(),
            lastMessageBy: messages.first()?.author.tag,
          };
        } catch (error) {
          // If can't fetch messages, just note it
          channelInfo.activity = {
            error: "Cannot access message history",
          };
        }
      }

      if (
        targetChannel.type === ChannelType.GuildVoice ||
        targetChannel.type === ChannelType.GuildStageVoice
      ) {
        const voiceChannel = targetChannel;
        channelInfo.voice = {
          bitrate: voiceChannel.bitrate,
          userLimit: voiceChannel.userLimit,
          rtcRegion: voiceChannel.rtcRegion,
          position: voiceChannel.position,
          parentId: voiceChannel.parentId,
          parentName: voiceChannel.parent?.name,
          currentUsers: voiceChannel.members?.size || 0,
          members:
            voiceChannel.members?.map((member) => ({
              id: member.id,
              tag: member.user.tag,
              muted: member.voice.mute,
              deafened: member.voice.deaf,
            })) || [],
        };
      }

      if (targetChannel.type === ChannelType.GuildCategory) {
        const categoryChannel = targetChannel;
        const children = guild.channels.cache.filter(
          (channel) => channel.parentId === targetChannel.id
        );

        channelInfo.category = {
          position: categoryChannel.position,
          childrenCount: children.size,
          children: children.map((child) => ({
            id: child.id,
            name: "name" in child ? child.name : "Unknown",
            type: child.type,
            typeString: this.getChannelTypeString(child.type),
          })),
        };
      }

      if (
        targetChannel.type === ChannelType.PublicThread ||
        targetChannel.type === ChannelType.PrivateThread
      ) {
        const threadChannel = targetChannel;
        channelInfo.thread = {
          archived: threadChannel.archived,
          autoArchiveDuration: threadChannel.autoArchiveDuration,
          archiveTimestamp: threadChannel.archiveTimestamp
            ? new Date(threadChannel.archiveTimestamp).toISOString()
            : null,
          locked: threadChannel.locked,
          invitable: threadChannel.invitable,
          parentId: threadChannel.parentId,
          parentName: threadChannel.parent?.name,
          ownerId: threadChannel.ownerId,
          memberCount: threadChannel.memberCount,
          messageCount: threadChannel.messageCount,
        };
      }

      // Get permissions for bot
      if (
        "guild" in targetChannel &&
        targetChannel.guild &&
        context.botMember
      ) {
        const botPermissions = context.botMember.permissionsIn(targetChannel);

        channelInfo.permissions = {
          bot: botPermissions.toArray(),
          botCanView: botPermissions.has("ViewChannel"),
          botCanSend: botPermissions.has("SendMessages"),
          botCanManage: botPermissions.has("ManageChannels"),
        };
      }

      logger.info(
        `Channel info retrieved for ${targetChannel.id} by agent (thread: ${context.threadId})`
      );

      return {
        success: true,
        data: channelInfo,
        message: `Retrieved information for channel ${channelInfo.basic.name}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("GetChannelInfoTool execution failed:", error);

      // Handle specific Discord errors
      if (errorMessage.includes("Missing Permissions")) {
        return {
          success: false,
          error: "I do not have permission to view channel information",
        };
      }

      return {
        success: false,
        error: `Failed to get channel info: ${errorMessage}`,
      };
    }
  }

  /**
   * Get human-readable channel type string
   */
  private getChannelTypeString(type: ChannelType): string {
    switch (type) {
      case ChannelType.GuildText:
        return "Text Channel";
      case ChannelType.DM:
        return "Direct Message";
      case ChannelType.GuildVoice:
        return "Voice Channel";
      case ChannelType.GroupDM:
        return "Group DM";
      case ChannelType.GuildCategory:
        return "Category";
      case ChannelType.GuildNews:
        return "News Channel";
      case ChannelType.GuildStageVoice:
        return "Stage Channel";
      case ChannelType.PublicThread:
        return "Public Thread";
      case ChannelType.PrivateThread:
        return "Private Thread";
      case ChannelType.GuildForum:
        return "Forum Channel";
      default:
        return "Unknown";
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
      return `${years} year${years === 1 ? "" : "s"}`;
    } else if (months > 0) {
      return `${months} month${months === 1 ? "" : "s"}`;
    } else if (days > 0) {
      return `${days} day${days === 1 ? "" : "s"}`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? "" : "s"}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    } else {
      return "Just created";
    }
  }
}
