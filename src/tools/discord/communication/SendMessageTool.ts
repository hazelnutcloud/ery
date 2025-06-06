import { Tool, type ToolContext, type ToolResult } from "../../base/Tool";
import { logger } from "../../../utils/logger";
import type { Message } from "discord.js";

export class SendMessageTool extends Tool {
  constructor() {
    super(
      "send_message",
      "Send a message to the current channel or a specified channel",
      [
        {
          name: "content",
          type: "string",
          description: "The message content to send",
          required: true,
        },
        {
          name: "channelId",
          type: "channel",
          description:
            "The channel ID to send the message to (optional, defaults to current channel)",
          required: false,
        },
        {
          name: "reply",
          type: "boolean",
          description: "Whether to reply to the original message",
          required: false,
        },
      ],
      {
        botPermissions: ["SendMessages"],
        allowInDMs: true,
      }
    );
  }

  async execute(
    context: ToolContext,
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    try {
      const { content, channelId, reply } = parameters;

      // Validate content
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: "Message content cannot be empty",
        };
      }

      if (content.length > 2000) {
        return {
          success: false,
          error: "Message content cannot exceed 2000 characters",
        };
      }

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

      // Send the message
      let sentMessage: Message;
      if (reply && context.message) {
        sentMessage = await context.message.reply(content);
      } else {
        if (targetChannel.isSendable()) {
          sentMessage = await targetChannel.send(content);
        } else {
          return {
            success: false,
            error: "Target channel cannot be sent a message",
          };
        }
      }

      logger.info(
        `Message sent to channel ${targetChannel.id}: ${content.substring(
          0,
          50
        )}...`
      );

      return {
        success: true,
        data: {
          messageId: sentMessage.id,
          channelId: sentMessage.channelId,
          content: sentMessage.content,
        },
        message: `Message sent successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("SendMessageTool execution failed:", error);

      return {
        success: false,
        error: `Failed to send message: ${errorMessage}`,
      };
    }
  }
}
