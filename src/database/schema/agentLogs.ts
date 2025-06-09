import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
import { taskThreads } from "./taskThreads";
import type { AgentLogMetadata, AgentLogType, ToolExecutionLog } from "../../types/agentLogs";
import type { AIUsage } from "../../types/agentLogs";

export const agentLogs = pgTable(
  "agent_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskThreadId: uuid("task_thread_id")
      .notNull()
      .references(() => taskThreads.id, { onDelete: "cascade" }),
    logType: text("log_type").$type<AgentLogType>().notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    channelId: text("channel_id").notNull(),
    guildId: text("guild_id").notNull(),
    userId: text("user_id"), // User who triggered the action, if applicable
    toolName: text("tool_name"),
    toolParameters: jsonb("tool_parameters").$type<Record<string, unknown>>(),
    toolResult: jsonb("tool_result").$type<ToolExecutionLog>(),
    aiModelUsed: text("ai_model_used"),
    aiTokensUsed: jsonb("ai_tokens_used").$type<AIUsage>(),
    executionTimeMs: integer("execution_time_ms"),
    success: boolean("success"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<AgentLogMetadata>(), // Flexible for additional context
  },
  (table) => [
    index("idx_agent_logs_task_thread_id").on(table.taskThreadId),
    index("idx_agent_logs_log_type").on(table.logType),
    index("idx_agent_logs_timestamp").on(table.timestamp),
    index("idx_agent_logs_channel_id").on(table.channelId),
    index("idx_agent_logs_guild_id").on(table.guildId),
  ]
);
