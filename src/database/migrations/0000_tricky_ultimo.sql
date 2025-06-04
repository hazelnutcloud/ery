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
CREATE TABLE `tool_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`parameters` text NOT NULL,
	`result` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`executed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`execution_duration_ms` integer,
	`error` text,
	FOREIGN KEY (`thread_id`) REFERENCES `task_threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `server_channels` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`permissions` text DEFAULT '{}' NOT NULL,
	`last_activity_at` integer,
	FOREIGN KEY (`guild_id`) REFERENCES `servers`(`guild_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`rules` text DEFAULT '[]' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_active_at` integer DEFAULT (unixepoch()) NOT NULL,
	`features` text DEFAULT '{}' NOT NULL,
	`custom_responses` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `moderation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text,
	`user_id` text NOT NULL,
	`moderator_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`duration` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer,
	`thread_id` text,
	FOREIGN KEY (`thread_id`) REFERENCES `task_threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_warnings` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`moderator_id` text NOT NULL,
	`reason` text NOT NULL,
	`severity` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`type` text NOT NULL,
	`input` text NOT NULL,
	`response` text,
	`successful` integer DEFAULT true NOT NULL,
	`feedback` text,
	`thread_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_guild_data` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`nickname` text,
	`joined_at` integer,
	`message_count` integer DEFAULT 0 NOT NULL,
	`last_message_at` integer,
	`reputation` integer DEFAULT 0 NOT NULL,
	`custom_data` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`discriminator` text,
	`global_name` text,
	`avatar_hash` text,
	`bot` integer DEFAULT false NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL
);
