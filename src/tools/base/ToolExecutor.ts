import type { Message } from "discord.js";
import { Tool, type ToolContext, type ToolResult } from "./Tool";
import { toolRegistry } from "./ToolRegistry";
import { logger } from "../../utils/logger";
import { generateId } from "../../utils/uuid";
import type { ChatCompletionTool } from "openai/resources";

export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, unknown>;
  context: ToolContext;
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
   * Execute a tool by name with given parameters
   */
  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionId = generateId();

    logger.info(`Executing tool ${request.toolName} (${executionId})`);

    try {
      // Get the tool
      const tool = toolRegistry.get(request.toolName);
      if (!tool) {
        const error = `Tool ${request.toolName} not found`;
        await this.logExecution(
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

      // Validate context (permissions, etc.)
      const contextValidation = await tool.validateContext(request.context);
      if (!contextValidation.valid) {
        const error = `Context validation failed: ${contextValidation.error}`;
        await this.logExecution(
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
      const paramValidation = tool.validateParameters(request.parameters);
      if (!paramValidation.valid) {
        const error = `Parameter validation failed: ${paramValidation.error}`;
        await this.logExecution(
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
        `Executing ${request.toolName} with parameters:`,
        request.parameters
      );
      const result = await tool.execute(request.context, request.parameters);

      // Log the execution
      await this.logExecution(executionId, request, result, startTime);

      const executionTimeMs = Date.now() - startTime;
      logger.info(
        `Tool ${request.toolName} executed in ${executionTimeMs}ms (${
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
      logger.error(`Tool execution failed for ${request.toolName}:`, error);

      await this.logExecution(
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
   * Execute multiple tools in sequence
   */
  async executeMany(
    requests: ToolExecutionRequest[]
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const request of requests) {
      const result = await this.execute(request);
      results.push(result);

      // Stop execution if a tool fails (unless it's marked as optional)
      if (!result.success) {
        logger.warn(`Tool execution stopped due to failure: ${result.error}`);
        break;
      }
    }

    return results;
  }

  /**
   * Create tool context from a Discord message
   */
  createToolContext(message: Message): ToolContext {
    return {
      message,
      channel: message.channel, // Type assertion for Discord.js compatibility
      guild: message.guild,
      member: message.member || undefined,
      author: message.author,
    };
  }

  /**
   * Log tool execution to database
   */
  private async logExecution(
    executionId: string,
    request: ToolExecutionRequest,
    result: ToolResult,
    startTime: number
  ): Promise<void> {
    try {
      // TODO: Implement tool execution logging
      // For now, just log to console
      logger.info(
        `Tool execution logged: ${executionId} - ${request.toolName} - ${
          result.success ? "SUCCESS" : "FAILURE"
        }`
      );
    } catch (error) {
      logger.error("Failed to log tool execution:", error);
    }
  }

  /**
   * Get execution history for a user
   */
  async getExecutionHistory(userId: string, limit: number = 50) {
    try {
      // TODO: Implement execution history retrieval
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error("Failed to get execution history:", error);
      return [];
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(guildId?: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    topTools: Array<{ toolName: string; count: number }>;
  }> {
    try {
      // This would need proper SQL aggregation queries
      // For now, return placeholder data
      return {
        totalExecutions: 0,
        successRate: 1.0,
        averageExecutionTime: 0,
        topTools: [],
      };
    } catch (error) {
      logger.error("Failed to get execution stats:", error);
      return {
        totalExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        topTools: [],
      };
    }
  }

  /**
   * Check if a user can execute a specific tool
   */
  async canExecuteTool(
    toolName: string,
    context: ToolContext
  ): Promise<{ canExecute: boolean; reason?: string }> {
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      return { canExecute: false, reason: "Tool not found" };
    }

    const validation = await tool.validateContext(context);
    return {
      canExecute: validation.valid,
      reason: validation.error,
    };
  }

  /**
   * Get available tools for a context
   */
  async getAvailableTools(context: ToolContext): Promise<Tool[]> {
    const availableTools: Tool[] = [];

    for (const tool of toolRegistry.getAll()) {
      const validation = await tool.validateContext(context);
      if (validation.valid) {
        availableTools.push(tool);
      }
    }

    return availableTools;
  }

  /**
   * Get function schemas for available tools in context
   */
  async getAvailableFunctionSchemas(
    context: ToolContext
  ): Promise<ChatCompletionTool[]> {
    const availableTools = await this.getAvailableTools(context);
    return availableTools.map((tool) => tool.getFunctionSchema());
  }
}

// Export singleton instance
export const toolExecutor = new ToolExecutor();
