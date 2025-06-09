import { db } from "../database/connection";
import { taskThreads } from "../database/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateId } from "../utils/uuid";
import { logger } from "../utils/logger";
import { config } from "../config";
import { agent } from "../ai";
import type {
  TaskThread,
  TaskThreadStatus,
  MessageBatch,
  BatchTrigger,
} from "./types";
import type { TaskThreadResult } from "../database/types";

export class TaskThreadManager {
  private activeThreads: Map<string, TaskThread[]> = new Map(); // channelId -> threads
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.startCleanupInterval();
  }

  async spawnThread(batch: MessageBatch): Promise<TaskThread> {
    try {
      // Create new thread
      const thread: TaskThread = {
        id: generateId(),
        batchId: batch.id,
        channelId: batch.channelId,
        guildId: batch.guildId,
        status: "active",
        batch,
        createdAt: new Date(),
      };

      // Store in database
      await db.insert(taskThreads).values({
        id: thread.id,
        channelId: thread.channelId,
        guildId: thread.guildId,
        status: thread.status,
        createdAt: thread.createdAt,
        context: batch,
      });

      // Cache in memory
      const channelThreads = this.activeThreads.get(batch.channelId) || [];
      channelThreads.push(thread);
      this.activeThreads.set(batch.channelId, channelThreads);

      logger.info(
        `Spawned new task thread ${thread.id} for batch ${batch.id} in channel ${batch.channelId} (trigger: ${batch.triggerType})`
      );

      // Process the thread with AI in the background
      this.processThreadWithAI(thread).catch((error) => {
        logger.error(`Failed to process thread ${thread.id} with AI:`, error);
        this.failThread(thread.id, `AI processing failed: ${error.message}`);
      });

      return thread;
    } catch (error) {
      logger.error("Failed to spawn task thread:", error);
      throw error;
    }
  }

  async completeThread(
    threadId: string,
    result: TaskThreadResult
  ): Promise<void> {
    try {
      const completedAt = new Date();

      // Update database
      await db
        .update(taskThreads)
        .set({
          status: "completed",
          completedAt,
          result: result,
        })
        .where(eq(taskThreads.id, threadId));

      // Remove from active threads cache
      this.removeThreadFromCache(threadId);

      logger.info(`Completed task thread ${threadId}`);
    } catch (error) {
      logger.error(`Failed to complete task thread ${threadId}:`, error);
      throw error;
    }
  }

  async failThread(threadId: string, error: string): Promise<void> {
    try {
      const completedAt = new Date();

      // Update database
      await db
        .update(taskThreads)
        .set({
          status: "failed",
          completedAt,
          error,
        })
        .where(eq(taskThreads.id, threadId));

      // Remove from active threads cache
      this.removeThreadFromCache(threadId);

      logger.error(`Failed task thread ${threadId}: ${error}`);
    } catch (error) {
      logger.error(`Failed to mark task thread ${threadId} as failed:`, error);
      throw error;
    }
  }

  async getActiveThreads(channelId: string): Promise<TaskThread[]> {
    // Check memory cache first
    const cachedThreads = this.activeThreads.get(channelId);
    if (cachedThreads && cachedThreads.length > 0) {
      return cachedThreads;
    }

    // Check database
    const dbThreads = await db
      .select()
      .from(taskThreads)
      .where(
        and(
          eq(taskThreads.channelId, channelId),
          eq(taskThreads.status, "active")
        )
      );

    const threads: TaskThread[] = dbThreads.map((dbThread) => {
      const batch = dbThread.context;
      return {
        id: dbThread.id,
        batchId: batch.id,
        channelId: dbThread.channelId,
        guildId: dbThread.guildId,
        status: dbThread.status as TaskThreadStatus,
        batch,
        createdAt: new Date(dbThread.createdAt),
        completedAt: dbThread.completedAt
          ? new Date(dbThread.completedAt)
          : undefined,
        result: dbThread.result || undefined,
        error: dbThread.error || undefined,
      };
    });

    // Cache them
    if (threads.length > 0) {
      this.activeThreads.set(channelId, threads);
    }

    return threads;
  }

  async cleanupInactiveThreads(): Promise<void> {
    try {
      const timeoutMs = config.taskThread.threadTimeoutMs;
      const cutoffTime = new Date(Date.now() - timeoutMs);

      // Find inactive threads
      const inactiveThreads = await db
        .select()
        .from(taskThreads)
        .where(
          and(
            eq(taskThreads.status, "active"),
            sql`${taskThreads.createdAt} < ${cutoffTime.toISOString()}`
          )
        );

      for (const thread of inactiveThreads) {
        await this.failThread(thread.id, "Thread timed out due to inactivity");
      }

      if (inactiveThreads.length > 0) {
        logger.info(`Cleaned up ${inactiveThreads.length} inactive threads`);
      }
    } catch (error) {
      logger.error("Failed to cleanup inactive threads:", error);
    }
  }

  private removeThreadFromCache(threadId: string): void {
    for (const [channelId, threads] of this.activeThreads.entries()) {
      const index = threads.findIndex((t) => t.id === threadId);
      if (index !== -1) {
        threads.splice(index, 1);
        if (threads.length === 0) {
          this.activeThreads.delete(channelId);
        }
        break;
      }
    }
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(
      () => this.cleanupInactiveThreads(),
      config.taskThread.cleanupIntervalMs
    );
  }

  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Process a thread with AI
   */
  private async processThreadWithAI(thread: TaskThread): Promise<void> {
    try {
      logger.debug(`Processing thread ${thread.id} with AI`);

      // Process with AI agent
      const result = await agent.processTaskThread(thread.batch);

      // Complete the thread with the result
      await this.completeThread(thread.id, result);

      logger.info(
        `Thread ${thread.id} completed successfully with AI processing`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`AI processing failed for thread ${thread.id}:`, error);

      // Fail the thread
      await this.failThread(thread.id, errorMessage);
    }
  }

  /**
   * Get active thread count for a guild
   */
  async getActiveThreadCount(guildId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskThreads)
      .where(
        and(eq(taskThreads.guildId, guildId), eq(taskThreads.status, "active"))
      );

    return result[0]?.count || 0;
  }

  /**
   * Check if guild has reached thread limit
   */
  async hasReachedThreadLimit(guildId: string): Promise<boolean> {
    const count = await this.getActiveThreadCount(guildId);
    return count >= config.taskThread.maxActiveThreadsPerGuild;
  }

  /**
   * Get active thread count for a specific channel
   */
  async getActiveThreadCountForChannel(channelId: string): Promise<number> {
    const threads = await this.getActiveThreads(channelId);
    return threads.length;
  }

  /**
   * Get a specific thread by ID
   */
  async getThread(threadId: string): Promise<TaskThread | null> {
    // Check cache first
    for (const threads of this.activeThreads.values()) {
      const thread = threads.find((t) => t.id === threadId);
      if (thread) return thread;
    }

    // Check database
    const dbThreads = await db
      .select()
      .from(taskThreads)
      .where(eq(taskThreads.id, threadId))
      .limit(1);

    const dbThread = dbThreads[0];
    if (!dbThread) return null;

    const batch = dbThread.context;
    return {
      id: dbThread.id,
      batchId: batch.id,
      channelId: dbThread.channelId,
      guildId: dbThread.guildId,
      status: dbThread.status as TaskThreadStatus,
      batch,
      createdAt: new Date(dbThread.createdAt),
      completedAt: dbThread.completedAt
        ? new Date(dbThread.completedAt)
        : undefined,
      result: dbThread.result || undefined,
      error: dbThread.error || undefined,
    };
  }

  /**
   * Get statistics about current threads
   */
  getThreadStats(): {
    totalActiveThreads: number;
    threadsByChannel: Record<string, number>;
    threadsByGuild: Record<string, number>;
  } {
    const threadsByChannel: Record<string, number> = {};
    const threadsByGuild: Record<string, number> = {};
    let totalActiveThreads = 0;

    for (const [channelId, threads] of this.activeThreads.entries()) {
      threadsByChannel[channelId] = threads.length;
      totalActiveThreads += threads.length;

      for (const thread of threads) {
        threadsByGuild[thread.guildId] =
          (threadsByGuild[thread.guildId] || 0) + 1;
      }
    }

    return {
      totalActiveThreads,
      threadsByChannel,
      threadsByGuild,
    };
  }
}
