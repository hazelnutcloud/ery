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

    // Check for bot mention first (immediate trigger)
    const botMentioned = this.isBotMentioned(message);
    if (botMentioned) {
      logger.debug(
        `Bot mentioned in message ${message.id}, triggering immediate batch`
      );
      await this.processBatch(channelId, "bot_mention", message);
      return;
    }

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
    triggerType: BatchTrigger,
    triggerMessage?: Message
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
      id: generateId(),
      channelId: queue.channelId,
      guildId: queue.guildId,
      messages: [...queue.messages], // Copy messages
      createdAt: new Date(),
      triggerType,
      triggerMessage,
    };

    // Clear the queue for next batch
    queue.messages = [];

    logger.info(
      `Created message batch ${batch.id} for channel ${channelId} with ${batch.messages.length} messages (trigger: ${triggerType})`
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

  /**
   * Get statistics about current queues
   */
  getQueueStats(): {
    totalQueues: number;
    totalMessages: number;
    queuesByChannel: Record<string, number>;
  } {
    const queuesByChannel: Record<string, number> = {};
    let totalMessages = 0;

    for (const [channelId, queue] of this.queues.entries()) {
      queuesByChannel[channelId] = queue.messages.length;
      totalMessages += queue.messages.length;
    }

    return {
      totalQueues: this.queues.size,
      totalMessages,
      queuesByChannel,
    };
  }
}
