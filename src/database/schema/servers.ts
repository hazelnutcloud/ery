import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const servers = sqliteTable('servers', {
  guildId: text('guild_id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  config: text('config', { mode: 'json' }).notNull().default('{}'), // Server-specific configuration
  rules: text('rules', { mode: 'json' }).notNull().default('[]'), // Moderation rules
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  features: text('features', { mode: 'json' }).notNull().default('{}'), // Enabled features
  customResponses: text('custom_responses', { mode: 'json' }).notNull().default('{}'), // Server-specific responses
});

export const serverChannels = sqliteTable('server_channels', {
  channelId: text('channel_id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => servers.guildId),
  name: text('name').notNull(),
  type: text('type').notNull(), // text, voice, category, etc.
  config: text('config', { mode: 'json' }).notNull().default('{}'), // Channel-specific settings
  permissions: text('permissions', { mode: 'json' }).notNull().default('{}'), // Bot permissions in channel
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
}, (table) => ({
  guildIdIdx: index('idx_server_channels_guild').on(table.guildId),
}));
