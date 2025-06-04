import { Message } from 'discord.js';
import { db } from '../database/connection';
import { taskThreads, toolExecutions } from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { generateId } from '../utils/uuid';
import { logger } from '../utils/logger';
import { config } from '../config';
import { contextManager } from './contextManager';
import type { TaskThread, TaskThreadManager as ITaskThreadManager, TaskThreadStatus } from './types';

class TaskThreadManagerImpl implements ITaskThreadManager {
  private activeThreads: Map<string, TaskThread> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.startCleanupInterval();
  }

  async createThread(message: Message): Promise<TaskThread> {
    const channelId = message.channel.id;
    
    // Check if there's already an active thread for this channel
    const existingThread = await this.getActiveThread(channelId);
    if (existingThread) {
      logger.debug(`Active thread already exists for channel ${channelId}`);
      return existingThread;
    }

    try {
      // Fetch context for the thread
      const context = await contextManager.fetchContext(message);
      
      // Create new thread
      const thread: TaskThread = {
        id: generateId(),
        channelId,
        guildId: message.guild?.id || 'DM',
        status: 'active',
        context,
        createdAt: new Date(),
      };

      // Store in database
      await db.insert(taskThreads).values({
        id: thread.id,
        channelId: thread.channelId,
        guildId: thread.guildId,
        status: thread.status,
        createdAt: thread.createdAt,
        context: JSON.stringify(context),
        triggerMessageId: message.id,
      });

      // Cache in memory
      this.activeThreads.set(channelId, thread);

      logger.info(`Created new task thread ${thread.id} for channel ${channelId}`);
      return thread;
    } catch (error) {
      logger.error('Failed to create task thread:', error);
      throw error;
    }
  }

  async completeThread(threadId: string, result: any): Promise<void> {
    try {
      const completedAt = new Date();
      
      // Update database
      await db.update(taskThreads)
        .set({
          status: 'completed',
          completedAt,
          result: JSON.stringify(result),
        })
        .where(eq(taskThreads.id, threadId));

      // Remove from active threads cache
      for (const [channelId, thread] of this.activeThreads.entries()) {
        if (thread.id === threadId) {
          this.activeThreads.delete(channelId);
          break;
        }
      }

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
      await db.update(taskThreads)
        .set({
          status: 'failed',
          completedAt,
          error,
        })
        .where(eq(taskThreads.id, threadId));

      // Remove from active threads cache
      for (const [channelId, thread] of this.activeThreads.entries()) {
        if (thread.id === threadId) {
          this.activeThreads.delete(channelId);
          break;
        }
      }

      logger.error(`Failed task thread ${threadId}: ${error}`);
    } catch (error) {
      logger.error(`Failed to mark task thread ${threadId} as failed:`, error);
      throw error;
    }
  }

  async getActiveThread(channelId: string): Promise<TaskThread | null> {
    // Check memory cache first
    const cachedThread = this.activeThreads.get(channelId);
    if (cachedThread) {
      return cachedThread;
    }

    // Check database
    const dbThreads = await db.select()
      .from(taskThreads)
      .where(
        and(
          eq(taskThreads.channelId, channelId),
          eq(taskThreads.status, 'active')
        )
      )
      .limit(1);

    const dbThread = dbThreads[0];
    if (!dbThread) {
      return null;
    }

    // Reconstruct thread from database
    const thread: TaskThread = {
      id: dbThread.id,
      channelId: dbThread.channelId,
      guildId: dbThread.guildId,
      status: dbThread.status as TaskThreadStatus,
      context: JSON.parse(dbThread.context as string),
      createdAt: new Date(dbThread.createdAt),
      completedAt: dbThread.completedAt ? new Date(dbThread.completedAt) : undefined,
      result: dbThread.result ? JSON.parse(dbThread.result as string) : undefined,
      error: dbThread.error || undefined,
    };

    // Cache it
    this.activeThreads.set(channelId, thread);

    return thread;
  }

  async cleanupInactiveThreads(): Promise<void> {
    try {
      const timeoutMs = config.taskThread.threadTimeoutMs;
      const cutoffTime = new Date(Date.now() - timeoutMs);

      // Find inactive threads
      const inactiveThreads = await db.select()
        .from(taskThreads)
        .where(
          and(
            eq(taskThreads.status, 'active'),
            sql`${taskThreads.createdAt} < ${cutoffTime.toISOString()}`
          )
        );

      for (const thread of inactiveThreads) {
        await this.failThread(thread.id, 'Thread timed out due to inactivity');
      }

      if (inactiveThreads.length > 0) {
        logger.info(`Cleaned up ${inactiveThreads.length} inactive threads`);
      }
    } catch (error) {
      logger.error('Failed to cleanup inactive threads:', error);
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
   * Get active thread count for a guild
   */
  async getActiveThreadCount(guildId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(taskThreads)
      .where(
        and(
          eq(taskThreads.guildId, guildId),
          eq(taskThreads.status, 'active')
        )
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
}

export const taskThreadManager = new TaskThreadManagerImpl();
