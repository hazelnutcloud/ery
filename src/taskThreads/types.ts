import { Message } from 'discord.js';
import type { TaskThreadResult } from '../database/types';

export type TaskThreadStatus = 'active' | 'completed' | 'failed';
export type ToolStatus = 'pending' | 'success' | 'failed';
export type BatchTrigger = 'message_count' | 'time_window' | 'bot_mention' | 'reply_to_bot';

export interface MessageBatch {
  channelId: string;
  guildId: string;
  messages: Message[];
  createdAt: Date;
  triggerType: BatchTrigger;
}

export interface TaskThread {
  id: string;
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
  processBatch(channelId: string, triggerType: BatchTrigger): Promise<MessageBatch>;
  cleanupQueues(): Promise<void>;
}
