CREATE TABLE `info_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_info_documents_guild` ON `info_documents` (`guild_id`);--> statement-breakpoint
CREATE INDEX `idx_info_documents_name_guild` ON `info_documents` (`name`,`guild_id`);