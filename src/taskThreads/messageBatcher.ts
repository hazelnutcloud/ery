import { EventEmitter } from "events";
import { Message } from "discord.js";
import { client } from "../bot/client";
import { config } from "../config";
import { logger } from "../utils/logger";
import { generateId } from "../utils/uuid";
import type { MessageQueue, MessageBatch, BatchTrigger } from "./types";

export class MessageBatcher extends EventEmitter {
  private queues: Map<string, MessageQueue> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startCleanupInterval();
  }

  async addMessage(message: Message): Promise<void> {
    const channelId = message.channel.id;
    const guildId = message.guild?.id || "DM";

    // Get or create queue for this channel
    let queue = this.queues.get(channelId);
    if (!queue) {
      queue = {
        channelId,
        guildId,
        messages: [],
        lastMessageAt: new Date(),
      };
      this.queues.set(channelId, queue);
    }

    // Clear existing timeout if any
    if (queue.timeoutId) {
      clearTimeout(queue.timeoutId);
    }

    // Add message to queue
    queue.messages.push(message);
    queue.lastMessageAt = new Date();

    // Check for reply messages (immediate trigger for bot replies, enhanced context for all)
    const replyInfo = await this.isReplyMessage(message);
    if (replyInfo.isReply && replyInfo.replyChain.length > 0) {
      // Add reply chain messages to batch if not already present
      this.addReplyChainToBatch(queue, replyInfo.replyChain);

      if (replyInfo.isBotReply) {
        logger.debug(
          `Reply to bot message detected in ${message.id}, triggering batch`
        );
        await this.processBatch(channelId, "reply_to_bot");
        return;
      }

      // For non-bot replies, we've added context but continue with normal batching
      logger.debug(`Reply chain added to context for message ${message.id}`);
    }

    // Check for bot mention (immediate trigger)
    const botMentioned = this.isBotMentioned(message);
    if (botMentioned) {
      logger.debug(`Bot mentioned in message ${message.id}, triggering batch`);
      await this.processBatch(channelId, "bot_mention");
      return;
    }

    // Check if we've reached the message count threshold
    if (queue.messages.length >= config.taskThread.batchMessageCount) {
      logger.debug(
        `Message count threshold reached for channel ${channelId}, triggering batch`
      );
      await this.processBatch(channelId, "message_count");
      return;
    }

    // Set timeout for time window trigger
    queue.timeoutId = setTimeout(async () => {
      logger.debug(
        `Time window expired for channel ${channelId}, triggering batch`
      );
      await this.processBatch(channelId, "time_window");
    }, config.taskThread.batchTimeWindowMs);

    logger.debug(
      `Added message to queue for channel ${channelId}. Queue size: ${queue.messages.length}`
    );
  }

  getQueue(channelId: string): MessageQueue | null {
    return this.queues.get(channelId) || null;
  }

  private async processBatch(
    channelId: string,
    triggerType: BatchTrigger
  ): Promise<MessageBatch> {
    const queue = this.queues.get(channelId);
    if (!queue || queue.messages.length === 0) {
      throw new Error(`No messages in queue for channel ${channelId}`);
    }

    // Clear timeout if exists
    if (queue.timeoutId) {
      clearTimeout(queue.timeoutId);
      queue.timeoutId = undefined;
    }

    // Create batch with current messages
    const batch: MessageBatch = {
      channelId: queue.channelId,
      guildId: queue.guildId,
      messages: [...queue.messages], // Copy messages
      createdAt: new Date(),
      triggerType,
    };

    // Clear the queue for next batch
    queue.messages = [];

    logger.info(
      `Created message batch for channel ${channelId} with ${batch.messages.length} messages (trigger: ${triggerType})`
    );

    // Emit event that batch is ready for processing
    this.emit("batchReady", batch);

    return batch;
  }

  async cleanupQueues(): Promise<void> {
    const now = Date.now();
    const maxAge = config.taskThread.maxQueueAge;
    const channelsToCleanup: string[] = [];

    for (const [channelId, queue] of this.queues.entries()) {
      const age = now - queue.lastMessageAt.getTime();
      if (age > maxAge) {
        channelsToCleanup.push(channelId);
      }
    }

    for (const channelId of channelsToCleanup) {
      const queue = this.queues.get(channelId);
      if (queue) {
        // Clear timeout
        if (queue.timeoutId) {
          clearTimeout(queue.timeoutId);
        }

        // Process remaining messages as a batch if any exist
        if (queue.messages.length > 0) {
          logger.debug(
            `Processing remaining ${queue.messages.length} messages in expired queue for channel ${channelId}`
          );
          await this.processBatch(channelId, "time_window");
        } else {
          // Just remove empty queue
          this.queues.delete(channelId);
        }
      }
    }

    if (channelsToCleanup.length > 0) {
      logger.debug(
        `Cleaned up ${channelsToCleanup.length} expired message queues`
      );
    }
  }

  private isBotMentioned(message: Message): boolean {
    if (!client.user) return false;

    // Check if bot is mentioned directly
    if (message.mentions.users.has(client.user.id)) {
      return true;
    }

    // Check if bot's roles are mentioned (if in a guild)
    if (message.guild && client.user) {
      const botMember = message.guild.members.cache.get(client.user.id);
      if (botMember) {
        for (const role of botMember.roles.cache.values()) {
          if (message.mentions.roles.has(role.id)) {
            return true;
          }
        }
      }
    }

    // Check for @everyone or @here mentions if bot has appropriate permissions
    if (message.mentions.everyone) {
      return true;
    }

    return false;
  }

  private async resolveReplyChain(message: Message): Promise<Message[]> {
    const replyChain: Message[] = [];
    const processedIds = new Set<string>();
    const maxDepth = config.taskThread.maxReplyChainDepth;
    const timeLimit = Date.now() - config.taskThread.replyChainTimeLimit;

    let currentMessage = message;
    let depth = 0;

    while (currentMessage.reference?.messageId && depth < maxDepth) {
      if (
        !currentMessage.reference ||
        processedIds.has(currentMessage.reference.messageId)
      )
        break;

      try {
        const referencedMessage = await currentMessage.channel.messages.fetch(
          currentMessage.reference.messageId
        );

        if (referencedMessage.createdTimestamp < timeLimit) break;

        replyChain.unshift(referencedMessage);
        processedIds.add(referencedMessage.id);
        currentMessage = referencedMessage;
        depth++;
      } catch (error) {
        logger.debug(
          `Could not fetch referenced message ${currentMessage.reference?.messageId}: ${error}`
        );
        break;
      }
    }

    return replyChain;
  }

  private async isReplyMessage(
    message: Message
  ): Promise<{ isReply: boolean; isBotReply: boolean; replyChain: Message[] }> {
    if (!message.reference?.messageId) {
      return { isReply: false, isBotReply: false, replyChain: [] };
    }

    const replyChain = await this.resolveReplyChain(message);

    const isBotReply = replyChain.some(
      (msg) => msg.author.id === client.user?.id
    );

    return {
      isReply: true,
      isBotReply,
      replyChain,
    };
  }

  private addReplyChainToBatch(
    queue: MessageQueue,
    replyChain: Message[]
  ): void {
    const existingIds = new Set(queue.messages.map((m) => m.id));
    const lastMessage = queue.messages[queue.messages.length - 1]!;

    for (const replyMessage of replyChain) {
      if (!existingIds.has(replyMessage.id)) {
        queue.messages[queue.messages.length - 1] = replyMessage;
        queue.messages.push(lastMessage); // Ensure last message is preserved
      }
    }

    queue.messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(
      () => this.cleanupQueues(),
      config.taskThread.queueCleanupIntervalMs
    );
  }

  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all timeouts
    for (const queue of this.queues.values()) {
      if (queue.timeoutId) {
        clearTimeout(queue.timeoutId);
      }
    }
  }
}
