import { Message } from 'discord.js';

export type TaskThreadStatus = 'active' | 'completed' | 'failed';
export type ToolStatus = 'pending' | 'success' | 'failed';

export interface TaskThreadContext {
  messages: Message[];
  channelId: string;
  guildId: string;
  triggerMessage: Message;
  timestamp: Date;
}

export interface TaskThread {
  id: string;
  channelId: string;
  guildId: string;
  status: TaskThreadStatus;
  context: TaskThreadContext;
  createdAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface ToolExecution {
  id: string;
  threadId: string;
  toolName: string;
  parameters: any;
  result?: any;
  status: ToolStatus;
  executedAt: Date;
  executionDurationMs?: number;
  error?: string;
}

export interface TaskThreadManager {
  createThread(message: Message): Promise<TaskThread>;
  completeThread(threadId: string, result: any): Promise<void>;
  failThread(threadId: string, error: string): Promise<void>;
  getActiveThread(channelId: string): Promise<TaskThread | null>;
  cleanupInactiveThreads(): Promise<void>;
}
