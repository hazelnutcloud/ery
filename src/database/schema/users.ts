import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  userId: text('user_id').primaryKey(), // Discord user ID
  username: text('username').notNull(),
  discriminator: text('discriminator'), // May be null for new usernames
  globalName: text('global_name'), // Display name
  avatarHash: text('avatar_hash'),
  bot: integer('bot', { mode: 'boolean' }).notNull().default(false),
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const userGuildData = sqliteTable('user_guild_data', {
  id: text('id').primaryKey(), // Composite key: userId_guildId
  userId: text('user_id').notNull().references(() => users.userId),
  guildId: text('guild_id').notNull(),
  nickname: text('nickname'),
  joinedAt: integer('joined_at', { mode: 'timestamp' }),
  messageCount: integer('message_count').notNull().default(0),
  lastMessageAt: integer('last_message_at', { mode: 'timestamp' }),
  reputation: integer('reputation').notNull().default(0),
  customData: text('custom_data', { mode: 'json' }).notNull().default('{}'),
}, (table) => ({
  userIdIdx: index('idx_user_guild_data_user').on(table.userId),
  guildIdIdx: index('idx_user_guild_data_guild').on(table.guildId),
}));

export const interactions = sqliteTable('interactions', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.userId),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull(),
  type: text('type').notNull(), // query, command, conversation
  input: text('input').notNull(),
  response: text('response'),
  successful: integer('successful', { mode: 'boolean' }).notNull().default(true),
  feedback: text('feedback'), // User feedback on the interaction
  threadId: text('thread_id'), // Link to task thread if applicable
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: index('idx_interactions_user').on(table.userId),
}));
