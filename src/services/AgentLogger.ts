import { db } from "../database/connection";
import { agentLogs } from "../database/schema/agentLogs";
import { logger } from "../utils/logger";
import type { AgentLogType, AgentLogMetadata, ToolExecutionLog, AIUsage } from "../types/agentLogs";

export class AgentLogger {
  /**
   * Logs an agent activity to the database.
   * This method is asynchronous to prevent blocking the main agent execution flow.
   */
  async log(
    taskThreadId: string,
    logType: AgentLogType,
    channelId: string,
    guildId: string,
    data: {
      userId?: string;
      toolName?: string;
      toolParameters?: Record<string, unknown>;
      toolResult?: ToolExecutionLog;
      aiModelUsed?: string;
      aiTokensUsed?: AIUsage;
      executionTimeMs?: number;
      success?: boolean;
      errorMessage?: string;
      metadata?: AgentLogMetadata;
    } = {}
  ): Promise<void> {
    try {
      await db.insert(agentLogs).values({
        taskThreadId,
        logType,
        channelId,
        guildId,
        userId: data.userId,
        toolName: data.toolName,
        toolParameters: data.toolParameters,
        toolResult: data.toolResult,
        aiModelUsed: data.aiModelUsed,
        aiTokensUsed: data.aiTokensUsed,
        executionTimeMs: data.executionTimeMs,
        success: data.success,
        errorMessage: data.errorMessage,
        metadata: data.metadata,
      });
      logger.debug(`Agent log recorded: ${logType} for thread ${taskThreadId}`);
    } catch (error) {
      logger.error(`Failed to log agent activity for thread ${taskThreadId}:`, error);
    }
  }

  /**
   * Logs the start of an agent's processing for a task thread.
   */
  async logAgentStart(
    taskThreadId: string,
    channelId: string,
    guildId: string,
    userId?: string,
    metadata?: AgentLogMetadata
  ): Promise<void> {
    await this.log(taskThreadId, "agent_start", channelId, guildId, { userId, metadata });
  }

  /**
   * Logs a tool execution by the agent.
   */
  async logToolExecution(
    taskThreadId: string,
    channelId: string,
    guildId: string,
    toolName: string,
    toolParameters: Record<string, unknown>,
    toolResult: ToolExecutionLog,
    executionTimeMs: number,
    success: boolean,
    errorMessage?: string,
    metadata?: AgentLogMetadata
  ): Promise<void> {
    await this.log(taskThreadId, "tool_execution", channelId, guildId, {
      toolName,
      toolParameters,
      toolResult,
      executionTimeMs,
      success,
      errorMessage,
      metadata,
    });
  }

  /**
   * Logs an AI response (e.g., model used, token usage).
   */
  async logAIResponse(
    taskThreadId: string,
    channelId: string,
    guildId: string,
    aiModelUsed: string,
    aiTokensUsed: AIUsage,
    metadata?: AgentLogMetadata
  ): Promise<void> {
    await this.log(taskThreadId, "ai_response", channelId, guildId, {
      aiModelUsed,
      aiTokensUsed,
      metadata,
    });
  }

  /**
   * Logs the completion of an agent's processing for a task thread.
   */
  async logAgentComplete(
    taskThreadId: string,
    channelId: string,
    guildId: string,
    success: boolean,
    executionTimeMs: number,
    errorMessage?: string,
    metadata?: AgentLogMetadata
  ): Promise<void> {
    await this.log(taskThreadId, "agent_complete", channelId, guildId, {
      success,
      executionTimeMs,
      errorMessage,
      metadata,
    });
  }

  /**
   * Logs an error during agent processing.
   */
  async logError(
    taskThreadId: string,
    channelId: string,
    guildId: string,
    errorMessage: string,
    metadata?: AgentLogMetadata
  ): Promise<void> {
    await this.log(taskThreadId, "error", channelId, guildId, {
      success: false,
      errorMessage,
      metadata,
    });
  }
}

export const agentLogger = new AgentLogger();
