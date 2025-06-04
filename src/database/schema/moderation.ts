import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const moderationLogs = sqliteTable('moderation_logs', {
  id: text('id').primaryKey(), // UUID
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id'),
  userId: text('user_id').notNull(), // User who was moderated
  moderatorId: text('moderator_id').notNull(), // Bot ID or admin who triggered
  action: text('action').notNull(), // ban, kick, timeout, warn, delete_message
  reason: text('reason'),
  duration: integer('duration'), // For timeouts, in seconds
  metadata: text('metadata', { mode: 'json' }), // Additional action-specific data
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // For temporary actions
  threadId: text('thread_id').references(() => taskThreads.id), // Link to task thread
}, (table) => ({
  guildIdIdx: index('idx_moderation_logs_guild').on(table.guildId),
  userIdIdx: index('idx_moderation_logs_user').on(table.userId),
}));

export const userWarnings = sqliteTable('user_warnings', {
  id: text('id').primaryKey(), // UUID
  guildId: text('guild_id').notNull(),
  userId: text('user_id').notNull(),
  moderatorId: text('moderator_id').notNull(),
  reason: text('reason').notNull(),
  severity: integer('severity').notNull().default(1), // 1-5 scale
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // When warning expires
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

// Import to establish foreign key reference
import { taskThreads } from './taskThreads';
