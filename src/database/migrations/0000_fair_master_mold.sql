CREATE TABLE "task_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"context" jsonb NOT NULL,
	"result" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "info_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_task_threads_channel" ON "task_threads" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_task_threads_status" ON "task_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_info_documents_guild" ON "info_documents" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "idx_info_documents_name_guild" ON "info_documents" USING btree ("name","guild_id");