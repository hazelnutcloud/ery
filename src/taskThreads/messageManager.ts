import { EventEmitter } from "events";
import { Message } from "discord.js";
import { logger } from "../utils/logger";
import { MessageBatcher } from "./messageBatcher";
import { TaskThreadManager } from "./manager";
import type { MessageBatch, TaskThread } from "./types";

export class MessageManager {
  private messageBatcher: MessageBatcher;
  private taskThreadManager: TaskThreadManager;

  constructor() {
    // Initialize components without circular dependencies
    this.messageBatcher = new MessageBatcher();
    this.taskThreadManager = new TaskThreadManager();

    // Set up event listeners for batch processing
    this.setupEventListeners();

    logger.info("MessageManager initialized with event-driven architecture");
  }

  /**
   * Add a message to the system for processing
   */
  async addMessage(message: Message): Promise<void> {
    try {
      // Add message to the batcher
      await this.messageBatcher.addMessage(message);
    } catch (error) {
      logger.error("Error adding message to MessageManager:", error);
      throw error;
    }
  }

  /**
   * Shutdown the message manager and cleanup resources
   */
  shutdown(): void {
    logger.info("Shutting down MessageManager...");

    // Stop cleanup intervals
    this.messageBatcher.stopCleanupInterval();
    this.taskThreadManager.stopCleanupInterval();

    logger.info("MessageManager shutdown complete");
  }

  /**
   * Set up event listeners for communication between components
   */
  private setupEventListeners(): void {
    // Listen for batch ready events from the message batcher
    this.messageBatcher.on("batchReady", this.handleBatchReady.bind(this));

    logger.debug("MessageManager event listeners configured");
  }

  /**
   * Handle when a batch is ready for processing
   */
  private async handleBatchReady(batch: MessageBatch): Promise<void> {
    try {
      logger.debug(`Handling batch ready event for batch ${batch.id}`);

      // Check if guild has reached thread limit first
      if (batch.messages[0]?.guild) {
        const hasReachedLimit =
          await this.taskThreadManager.hasReachedThreadLimit(
            batch.messages[0].guild.id
          );
        if (hasReachedLimit) {
          logger.warn(
            `Guild ${batch.messages[0].guild.id} has reached task thread limit`
          );
          return;
        }
      }

      // Spawn a thread for the batch
      const thread = await this.taskThreadManager.spawnThread(batch);

      logger.debug(
        `Successfully spawned thread ${thread.id} for batch ${batch.id}`
      );
    } catch (error) {
      logger.error(
        `Failed to handle batch ready event for batch ${batch.id}:`,
        error
      );
      // Don't throw here to avoid breaking the event flow
    }
  }
}

// Export singleton instance
export const messageManager = new MessageManager();
