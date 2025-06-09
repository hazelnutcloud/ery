import {
  AgentTool,
  type AgentExecutionContext,
  type ToolResult,
} from "../../base/AgentTool";
import { logger } from "../../../utils/logger";
import type { Message } from "discord.js";

export class SendMessageTool extends AgentTool {
  constructor() {
    super(
      "send_message",
      "Bot autonomously sends messages to communicate with users based on context analysis",
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
          name: "replyToMessageId",
          type: "string",
          description:
            "ID of the specific message to reply to (optional). If not provided, sends a regular message.",
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
    context: AgentExecutionContext,
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    try {
      const { content, channelId, replyToMessageId } = parameters;

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

        if (!channel.isTextBased() || channel.isVoiceBased()) {
          return {
            success: false,
            error: "Target channel is not a text channel",
          };
        }

        targetChannel = channel;
      }

      // Send the message
      let sentMessage: Message;
      if (replyToMessageId) {
        // Fetch the specific message to reply to
        try {
          const messageToReplyTo = await targetChannel.messages.fetch(
            replyToMessageId
          );
          sentMessage = await messageToReplyTo.reply(content);
        } catch (fetchError) {
          return {
            success: false,
            error: `Failed to fetch message with ID ${replyToMessageId}: ${
              fetchError instanceof Error
                ? fetchError.message
                : String(fetchError)
            }`,
          };
        }
      } else {
        // Send regular message
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
        `Message sent by agent to channel ${targetChannel.id} (thread: ${
          context.threadId
        }): ${content.substring(0, 50)}...`
      );

      return {
        success: true,
        data: {
          messageId: sentMessage.id,
          channelId: sentMessage.channelId,
          content: sentMessage.content,
          repliedToMessageId: replyToMessageId || null,
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
