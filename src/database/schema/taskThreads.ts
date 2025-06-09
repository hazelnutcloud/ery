import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import type { MessageBatch } from "../../taskThreads/types";
import type { TaskThreadResult } from "../types";

export const taskThreads = pgTable(
  "task_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(), // UUID
    channelId: text("channel_id").notNull(),
    guildId: text("guild_id").notNull(),
    status: text("status").notNull().default("active"), // active, completed, failed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    context: jsonb("context").$type<MessageBatch>().notNull(), // Message history and metadata
    result: jsonb("result").$type<TaskThreadResult>(), // Task execution result
    error: text("error"), // Error message if failed
  },
  (table) => [
    index("idx_task_threads_channel").on(table.channelId),
    index("idx_task_threads_status").on(table.status),
  ]
);
