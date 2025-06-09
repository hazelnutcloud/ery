import {
  AgentTool,
  type AgentExecutionContext,
  type ToolResult,
} from "./AgentTool";
import { toolRegistry } from "./ToolRegistry";
import { logger } from "../../utils/logger";
import { generateId } from "../../utils/uuid";
import type { ChatCompletionTool } from "openai/resources";
import type { MessageBatch } from "../../taskThreads/types";
import { agentLogger } from "../../services/AgentLogger";

export interface AgentToolExecutionRequest {
  toolName: string;
  parameters: Record<string, unknown>;
  context: AgentExecutionContext;
  threadId?: string;
}

export interface ToolExecutionResult extends ToolResult {
  executionId: string;
  toolName: string;
  executedAt: Date;
  executionTimeMs: number;
}

export class ToolExecutor {
  /**
   * Create agent execution context from a message batch and channel
   */
  createAgentExecutionContext(
    batch: MessageBatch,
    channel: AgentExecutionContext["channel"],
    guild?: AgentExecutionContext["guild"]
  ): AgentExecutionContext {
    return {
      channel,
      guild,
      botMember: guild?.members.me || undefined,
      batchInfo: {
        id: batch.id,
        messageCount: batch.messages.length,
        triggerType: batch.triggerType,
        channelId: batch.channelId,
        guildId: batch.guildId,
      },
    };
  }

  /**
   * Execute an agent tool with the new context system
   */
  async executeAgentTool(
    request: AgentToolExecutionRequest
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionId = generateId();

    logger.info(`Executing agent tool ${request.toolName} (${executionId})`);

    try {
      // Get the tool
      const agentTool = toolRegistry.get(request.toolName);
      if (!agentTool) {
        const error = `Tool ${request.toolName} not found`;
        await this.logAgentExecution(
          executionId,
          request,
          { success: false, error },
          startTime
        );
        return {
          executionId,
          toolName: request.toolName,
          success: false,
          error,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Validate execution context
      const executionValidation = await agentTool.validateExecution(
        request.context
      );
      if (!executionValidation.canExecute) {
        const error = `Execution validation failed: ${executionValidation.reason}`;
        await this.logAgentExecution(
          executionId,
          request,
          { success: false, error },
          startTime
        );
        return {
          executionId,
          toolName: request.toolName,
          success: false,
          error,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Validate parameters
      const paramValidation = agentTool.validateParameters(request.parameters);
      if (!paramValidation.valid) {
        const error = `Parameter validation failed: ${paramValidation.error}`;
        await this.logAgentExecution(
          executionId,
          request,
          { success: false, error },
          startTime
        );
        return {
          executionId,
          toolName: request.toolName,
          success: false,
          error,
          executedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Execute the tool
      logger.debug(
        `Executing agent tool ${request.toolName} with parameters:`,
        request.parameters
      );
      const result = await agentTool.execute(
        request.context,
        request.parameters
      );

      // Log the execution
      await this.logAgentExecution(executionId, request, result, startTime);

      const executionTimeMs = Date.now() - startTime;
      logger.info(
        `Agent tool ${request.toolName} executed in ${executionTimeMs}ms (${
          result.success ? "success" : "failure"
        })`
      );

      return {
        ...result,
        executionId,
        toolName: request.toolName,
        executedAt: new Date(),
        executionTimeMs,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Agent tool execution failed for ${request.toolName}:`,
        error
      );

      await this.logAgentExecution(
        executionId,
        request,
        {
          success: false,
          error: `Execution error: ${errorMessage}`,
        },
        startTime
      );

      return {
        executionId,
        toolName: request.toolName,
        success: false,
        error: errorMessage,
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get available agent tools for a context
   */
  async getAvailableAgentTools(
    context: AgentExecutionContext
  ): Promise<AgentTool[]> {
    const availableTools: AgentTool[] = [];

    for (const tool of toolRegistry.getAll()) {
      const validation = await tool.validateExecution(context);
      if (validation.canExecute) {
        availableTools.push(tool);
      }
    }

    return availableTools;
  }

  /**
   * Get function schemas for available agent tools in context
   */
  async getAvailableAgentFunctionSchemas(
    context: AgentExecutionContext
  ): Promise<ChatCompletionTool[]> {
    const availableTools = await this.getAvailableAgentTools(context);
    return availableTools.map((tool) => tool.getFunctionSchema());
  }

  /**
   * Log agent tool execution to database
   */
  private async logAgentExecution(
    executionId: string,
    request: AgentToolExecutionRequest,
    result: ToolResult,
    startTime: number
  ): Promise<void> {
    const executionTimeMs = Date.now() - startTime;
    await agentLogger.logToolExecution(
      request.threadId!, // threadId is guaranteed to be present when called from Agent.ts
      request.context.channel.id,
      request.context.guild?.id || "unknown",
      request.toolName,
      request.parameters,
      { ...result, executionId, toolName: request.toolName, executedAt: new Date(), executionTimeMs },
      executionTimeMs,
      result.success,
      result.error
    );
  }
}

// Export singleton instance
export const toolExecutor = new ToolExecutor();
