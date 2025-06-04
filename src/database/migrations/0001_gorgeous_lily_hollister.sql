CREATE INDEX `idx_tool_executions_thread` ON `tool_executions` (`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_server_channels_guild` ON `server_channels` (`guild_id`);--> statement-breakpoint
CREATE INDEX `idx_moderation_logs_guild` ON `moderation_logs` (`guild_id`);--> statement-breakpoint
CREATE INDEX `idx_moderation_logs_user` ON `moderation_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_interactions_user` ON `interactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_guild_data_user` ON `user_guild_data` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_guild_data_guild` ON `user_guild_data` (`guild_id`);