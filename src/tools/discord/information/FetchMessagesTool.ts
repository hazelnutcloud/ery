import { Tool, type ToolContext, type ToolResult } from "../../base/Tool";
import { logger } from "../../../utils/logger";
import type { FetchMessagesOptions } from "discord.js";

export class FetchMessagesTool extends Tool {
  constructor() {
    super(
      "fetch_messages",
      "Fetch messages from a channel",
      [
        {
          name: "limit",
          type: "number",
          description: "Number of messages to fetch (1-100)",
          required: false,
        },
        {
          name: "channelId",
          type: "channel",
          description:
            "Channel ID to fetch messages from (optional, defaults to current channel)",
          required: false,
        },
        {
          name: "beforeMessageId",
          type: "string",
          description: "Fetch messages before this message ID",
          required: false,
        },
        {
          name: "afterMessageId",
          type: "string",
          description: "Fetch messages after this message ID",
          required: false,
        },
      ],
      {
        botPermissions: ["ReadMessageHistory", "ViewChannel"],
        allowInDMs: true,
      }
    );
  }

  async execute(
    context: ToolContext,
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    try {
      const {
        limit = 10,
        channelId,
        beforeMessageId,
        afterMessageId,
      } = parameters;

      // Validate limit
      const messageLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));

      let targetChannel = context.channel;

      // If channelId is specified, try to get that channel
      if (channelId && context.guild) {
        const channel = await context.guild.channels.fetch(channelId);
        if (!channel) {
          return {
            success: false,
            error: `Channel with ID ${channelId} not found`,
          };
        }

        if (!channel.isTextBased()) {
          return {
            success: false,
            error: "Target channel is not a text channel",
          };
        }

        targetChannel = channel;
      }

      // Build fetch options
      const fetchOptions: FetchMessagesOptions = { limit: messageLimit };

      if (beforeMessageId) {
        fetchOptions.before = beforeMessageId;
      }

      if (afterMessageId) {
        fetchOptions.after = afterMessageId;
      }

      // Fetch messages
      const messages = await targetChannel.messages.fetch(fetchOptions);

      // Convert messages to a serializable format
      const messageData = messages.map((message) => ({
        id: message.id,
        content: message.content,
        author: {
          id: message.author.id,
          username: message.author.username,
          displayName: message.author.displayName,
          bot: message.author.bot,
        },
        createdAt: message.createdAt.toISOString(),
        editedAt: message.editedAt?.toISOString() || null,
        channelId: message.channelId,
        guildId: message.guildId,
        attachments: message.attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          size: attachment.size,
          contentType: attachment.contentType,
        })),
        embeds: message.embeds.length,
        mentions: {
          users: message.mentions.users.map((user) => ({
            id: user.id,
            username: user.username,
          })),
          roles: message.mentions.roles.map((role) => ({
            id: role.id,
            name: role.name,
          })),
          channels: message.mentions.channels.map((channel) => ({
            id: channel.id,
            name: "name" in channel ? channel.name : "Unknown",
          })),
          everyone: message.mentions.everyone,
        },
        reactions: message.reactions.cache.map((reaction) => ({
          emoji: reaction.emoji.name || reaction.emoji.toString(),
          count: reaction.count,
        })),
        type: message.type,
        pinned: message.pinned,
        tts: message.tts,
      }));

      logger.debug(
        `Fetched ${messageData.length} messages from channel ${targetChannel.id}`
      );

      return {
        success: true,
        data: {
          messages: messageData,
          channelId: targetChannel.id,
          fetchedAt: new Date().toISOString(),
          totalFetched: messageData.length,
        },
        message: `Successfully fetched ${messageData.length} messages`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("FetchMessagesTool execution failed:", error);

      // Handle specific Discord errors
      if (errorMessage.includes("Missing Access")) {
        return {
          success: false,
          error: "I do not have permission to read messages in this channel",
        };
      }

      if (errorMessage.includes("Unknown Channel")) {
        return {
          success: false,
          error: "Channel not found",
        };
      }

      return {
        success: false,
        error: `Failed to fetch messages: ${errorMessage}`,
      };
    }
  }
}
