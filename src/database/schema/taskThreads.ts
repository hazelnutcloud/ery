import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const taskThreads = sqliteTable('task_threads', {
  id: text('id').primaryKey(), // UUID
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id').notNull(),
  status: text('status').notNull().default('active'), // active, completed, failed
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  context: text('context', { mode: 'json' }).notNull(), // Message history and metadata
  triggerMessageId: text('trigger_message_id').notNull(),
  result: text('result', { mode: 'json' }), // Task execution result
  error: text('error'), // Error message if failed
}, (table) => ({
  channelIdIdx: index('idx_task_threads_channel').on(table.channelId),
  statusIdx: index('idx_task_threads_status').on(table.status),
}));

export const toolExecutions = sqliteTable('tool_executions', {
  id: text('id').primaryKey(), // UUID
  threadId: text('thread_id').notNull().references(() => taskThreads.id),
  toolName: text('tool_name').notNull(),
  parameters: text('parameters', { mode: 'json' }).notNull(),
  result: text('result', { mode: 'json' }),
  status: text('status').notNull().default('pending'), // pending, success, failed
  executedAt: integer('executed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  executionDurationMs: integer('execution_duration_ms'),
  error: text('error'),
}, (table) => ({
  threadIdIdx: index('idx_tool_executions_thread').on(table.threadId),
}));
