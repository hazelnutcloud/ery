CREATE TABLE "agent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_thread_id" uuid NOT NULL,
	"log_type" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text,
	"tool_name" text,
	"tool_parameters" jsonb,
	"tool_result" jsonb,
	"ai_model_used" text,
	"ai_tokens_used" jsonb,
	"execution_time_ms" integer,
	"success" boolean,
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_task_thread_id_task_threads_id_fk" FOREIGN KEY ("task_thread_id") REFERENCES "public"."task_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_logs_task_thread_id" ON "agent_logs" USING btree ("task_thread_id");--> statement-breakpoint
CREATE INDEX "idx_agent_logs_log_type" ON "agent_logs" USING btree ("log_type");--> statement-breakpoint
CREATE INDEX "idx_agent_logs_timestamp" ON "agent_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_agent_logs_channel_id" ON "agent_logs" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_agent_logs_guild_id" ON "agent_logs" USING btree ("guild_id");