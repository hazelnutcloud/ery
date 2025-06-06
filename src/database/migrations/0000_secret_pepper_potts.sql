CREATE TABLE `task_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	`context` text NOT NULL,
	`trigger_message_id` text NOT NULL,
	`result` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `idx_task_threads_channel` ON `task_threads` (`channel_id`);--> statement-breakpoint
CREATE INDEX `idx_task_threads_status` ON `task_threads` (`status`);