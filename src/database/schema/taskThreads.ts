import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { MessageBatch } from "../../taskThreads/types";
import type { TaskThreadResult } from "../types";

export const taskThreads = sqliteTable(
  "task_threads",
  {
    id: text("id").primaryKey(), // UUID
    channelId: text("channel_id").notNull(),
    guildId: text("guild_id").notNull(),
    status: text("status").notNull().default("active"), // active, completed, failed
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    context: text("context", { mode: "json" }).$type<MessageBatch>().notNull(), // Message history and metadata
    triggerMessageId: text("trigger_message_id").notNull(),
    result: text("result", { mode: "json" }).$type<TaskThreadResult>(), // Task execution result
    error: text("error"), // Error message if failed
  },
  (table) => [
    index("idx_task_threads_channel").on(table.channelId),
    index("idx_task_threads_status").on(table.status),
  ]
);
