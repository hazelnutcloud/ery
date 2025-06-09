import type { ToolExecutionResult } from "../tools/base/ToolExecutor";

export type AgentLogType =
  | "agent_start"
  | "tool_execution"
  | "ai_response"
  | "agent_complete"
  | "error";

export interface AgentLogMetadata {
  [key: string]: unknown;
}

export interface ToolExecutionLog extends ToolExecutionResult {}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
