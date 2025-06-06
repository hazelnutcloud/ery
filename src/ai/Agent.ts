import type { Message } from 'discord.js';
import { OpenRouterProvider, type AIResponse, type ProcessingContext } from './providers/OpenRouterProvider';
import { toolExecutor, type ToolExecutionRequest, type ToolExecutionResult } from '../tools';
import { logger } from '../utils/logger';
import type { MessageBatch } from '../taskThreads/types';
import type { TaskThreadResult } from '../database/types';

export interface AgentResponse {
  success: boolean;
  content?: string;
  toolExecutions: ToolExecutionResult[];
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class Agent {
  private aiProvider: OpenRouterProvider;
  private systemPrompt: string;

  constructor() {
    this.aiProvider = new OpenRouterProvider();
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * Process a message batch and generate response
   */
  async processMessage(batch: MessageBatch, triggerMessage: Message): Promise<AgentResponse> {
    logger.info(`Agent processing batch for channel ${batch.channelId}`);

    try {
      // Check if AI provider is ready
      if (!this.aiProvider.isReady()) {
        return {
          success: false,
          error: 'AI provider not configured. Please check your OpenRouter API key.',
          toolExecutions: [],
        };
      }

      // Create tool context from trigger message
      const toolContext = toolExecutor.createToolContext(triggerMessage);

      // Get available tools for this context
      const availableTools = await toolExecutor.getAvailableFunctionSchemas(toolContext);

      // Create processing context
      const processingContext: ProcessingContext = {
        batch,
        availableTools,
        systemPrompt: this.systemPrompt,
      };

      // Get AI response
      const aiResponse = await this.aiProvider.processContext(processingContext);

      // Execute any tool calls
      const toolExecutions: ToolExecutionResult[] = [];
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        logger.debug(`Executing ${aiResponse.toolCalls.length} tool calls`);

        for (const toolCall of aiResponse.toolCalls) {
          try {
            // Parse tool arguments
            const parameters = JSON.parse(toolCall.function.arguments);

            // Execute the tool
            const execution = await toolExecutor.execute({
              toolName: toolCall.function.name,
              parameters,
              context: toolContext,
              threadId: batch.id,
            });

            toolExecutions.push(execution);

            logger.debug(`Tool ${toolCall.function.name} executed: ${execution.success ? 'success' : 'failure'}`);

          } catch (error) {
            logger.error(`Failed to execute tool ${toolCall.function.name}:`, error);
            toolExecutions.push({
              executionId: `error-${Date.now()}`,
              toolName: toolCall.function.name,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              executedAt: new Date(),
              executionTimeMs: 0,
            });
          }
        }
      }

      // Send response message if AI provided content
      if (aiResponse.content && aiResponse.content.trim().length > 0) {
        try {
          await triggerMessage.reply(aiResponse.content);
          logger.debug('AI response sent to Discord');
        } catch (error) {
          logger.error('Failed to send AI response to Discord:', error);
        }
      }

      return {
        success: true,
        content: aiResponse.content,
        toolExecutions,
        usage: aiResponse.usage,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Agent processing failed:', error);

      return {
        success: false,
        error: errorMessage,
        toolExecutions: [],
      };
    }
  }

  /**
   * Build the system prompt for the AI
   */
  private buildSystemPrompt(): string {
    return `You are Ery, a helpful Discord bot assistant. You can help users with various tasks by using the available tools.

## Your Capabilities:
- Send messages to channels
- Fetch message history
- Moderate servers (ban members, etc.) - only when requested by authorized users
- General conversation and assistance

## Guidelines:
1. Be helpful, friendly, and concise
2. Only use tools when necessary and requested
3. Always explain what you're doing when using tools
4. Respect user permissions - don't perform moderation actions unless the user has appropriate permissions
5. If you can't help with something, explain why clearly
6. When using tools, provide clear feedback about what happened

## Tool Usage:
- Use send_message when you need to send a message to a specific channel or reply
- Use fetch_messages when users want to see message history
- Use ban_member only when explicitly requested by authorized users for moderation

## Important Notes:
- You are currently in a Discord server or DM
- Users may mention you or reply to your messages
- Always consider the context and be appropriate for the channel/server
- Don't spam or send excessive messages

Respond naturally and help users accomplish their tasks effectively.`;
  }

  /**
   * Update system prompt (for dynamic configuration)
   */
  updateSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    logger.info('System prompt updated');
  }

  /**
   * Get agent status information
   */
  getStatus(): {
    aiConfigured: boolean;
    aiModel: string;
    availableTools: number;
  } {
    const toolRegistry = require('../tools').toolRegistry;
    
    return {
      aiConfigured: this.aiProvider.isReady(),
      aiModel: this.aiProvider.getModelInfo().primary,
      availableTools: toolRegistry.getAll().length,
    };
  }

  /**
   * Process a batch and return structured result for database storage
   */
  async processTaskThread(batch: MessageBatch, triggerMessage: Message): Promise<TaskThreadResult> {
    const startTime = Date.now();
    const response = await this.processMessage(batch, triggerMessage);

    // Generate summary
    const summary = response.success 
      ? `Processed ${batch.messages.length} messages with ${response.toolExecutions.length} tool executions`
      : `Failed to process batch: ${response.error}`;

    // Convert tool executions to actions
    const actions = response.toolExecutions.map(exec => ({
      type: 'tool_execution',
      description: `Execute ${exec.toolName}`,
      success: exec.success,
      details: {
        toolName: exec.toolName,
        executionId: exec.executionId,
        result: exec.data,
        error: exec.error,
        executionTimeMs: exec.executionTimeMs,
      },
    }));

    return {
      success: response.success,
      summary,
      actions,
      aiResponse: response.content || undefined,
      processingTime: Date.now() - startTime,
      metadata: {
        usage: response.usage,
        error: response.error,
        batchId: batch.id,
        channelId: batch.channelId,
        messageCount: batch.messages.length,
      },
    };
  }
}

// Export singleton instance
export const agent = new Agent();
