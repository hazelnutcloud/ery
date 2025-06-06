import { Message } from 'discord.js';
import type { TaskThreadResult } from '../database/types';

export type TaskThreadStatus = 'active' | 'completed' | 'failed';
export type ToolStatus = 'pending' | 'success' | 'failed';
export type BatchTrigger = 'message_count' | 'time_window' | 'bot_mention';

export interface MessageBatch {
  id: string;
  channelId: string;
  guildId: string;
  messages: Message[];
  createdAt: Date;
  triggerType: BatchTrigger;
  triggerMessage?: Message; // The message that triggered the batch (for bot mentions)
}

export interface TaskThread {
  id: string;
  batchId: string;
  channelId: string;
  guildId: string;
  status: TaskThreadStatus;
  batch: MessageBatch;
  createdAt: Date;
  completedAt?: Date;
  result?: TaskThreadResult;
  error?: string;
}

export interface MessageQueue {
  channelId: string;
  guildId: string;
  messages: Message[];
  lastMessageAt: Date;
  timeoutId?: NodeJS.Timeout;
}


export interface MessageBatcher {
  addMessage(message: Message): Promise<void>;
  getQueue(channelId: string): MessageQueue | null;
  processBatch(channelId: string, triggerType: BatchTrigger, triggerMessage?: Message): Promise<MessageBatch>;
  cleanupQueues(): Promise<void>;
}
