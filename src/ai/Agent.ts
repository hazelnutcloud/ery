import type { Message } from 'discord.js';
import { OpenRouterProvider, type AIResponse, type ProcessingContext } from './providers/OpenRouterProvider';
import { toolExecutor, type ToolExecutionResult } from '../tools';
import { logger } from '../utils/logger';
import type { MessageBatch } from '../taskThreads/types';
import type { TaskThreadResult } from '../database/types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface AgentResponse {
  success: boolean;
  toolExecutions: ToolExecutionResult[];
  loopIterations: number;
  conversationMessages: number;
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
   * Process a message batch using loop-based approach
   */
  async processMessage(batch: MessageBatch): Promise<AgentResponse> {
    logger.info(`Agent processing batch for channel ${batch.channelId}`);

    const maxIterations = 10;
    const maxProcessingTime = 30000; // 30 seconds
    const startTime = Date.now();

    try {
      // Check if AI provider is ready
      if (!this.aiProvider.isReady()) {
        return {
          success: false,
          error: 'AI provider not configured. Please check your OpenRouter API key.',
          toolExecutions: [],
          loopIterations: 0,
          conversationMessages: 0,
        };
      }

      // Use the last message in the batch for tool context
      const contextMessage = batch.messages[batch.messages.length - 1];
      if (!contextMessage) {
        return {
          success: false,
          error: 'No messages available in batch for processing',
          toolExecutions: [],
          loopIterations: 0,
          conversationMessages: 0,
        };
      }

      // Create tool context from the context message
      const toolContext = toolExecutor.createToolContext(contextMessage);

      // Get available tools for this context
      const availableTools = await toolExecutor.getAvailableFunctionSchemas(toolContext);

      // Build initial conversation
      let conversation = this.aiProvider.buildInitialConversation(batch, this.systemPrompt);
      const allToolExecutions: ToolExecutionResult[] = [];
      let totalUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      // Main processing loop
      let iteration = 0;
      while (iteration < maxIterations) {
        // Check timeout
        if (Date.now() - startTime > maxProcessingTime) {
          logger.warn(`Agent processing timeout after ${maxProcessingTime}ms`);
          break;
        }

        iteration++;
        logger.debug(`Agent loop iteration ${iteration}`);

        let aiResponse: AIResponse;
        
        if (iteration === 1) {
          // First iteration: use processContext
          const processingContext: ProcessingContext = {
            batch,
            availableTools,
            systemPrompt: this.systemPrompt,
            conversationHistory: conversation,
          };
          aiResponse = await this.aiProvider.processContext(processingContext);
        } else {
          // Subsequent iterations: use continueConversation
          aiResponse = await this.aiProvider.continueConversation(conversation, availableTools);
        }

        // Track usage
        if (aiResponse.usage) {
          totalUsage.promptTokens += aiResponse.usage.promptTokens;
          totalUsage.completionTokens += aiResponse.usage.completionTokens;
          totalUsage.totalTokens += aiResponse.usage.totalTokens;
        }

        // If no tool calls, we're done
        if (!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) {
          logger.debug(`No tool calls in iteration ${iteration}, ending loop`);
          break;
        }

        // Execute tool calls
        logger.debug(`Executing ${aiResponse.toolCalls.length} tool calls in iteration ${iteration}`);
        const iterationToolExecutions: ToolExecutionResult[] = [];

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

            iterationToolExecutions.push(execution);
            allToolExecutions.push(execution);

            logger.debug(`Tool ${toolCall.function.name} executed: ${execution.success ? 'success' : 'failure'}`);

          } catch (error) {
            logger.error(`Failed to execute tool ${toolCall.function.name}:`, error);
            const errorExecution: ToolExecutionResult = {
              executionId: `error-${Date.now()}`,
              toolName: toolCall.function.name,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              executedAt: new Date(),
              executionTimeMs: 0,
            };
            iterationToolExecutions.push(errorExecution);
            allToolExecutions.push(errorExecution);
          }
        }

        // Add tool calls and results to conversation
        conversation = this.aiProvider.addToolCallToConversation(
          conversation,
          aiResponse.toolCalls,
          iterationToolExecutions
        );

        logger.debug(`Iteration ${iteration} completed, conversation now has ${conversation.length} messages`);
      }

      if (iteration >= maxIterations) {
        logger.warn(`Agent processing stopped after reaching max iterations (${maxIterations})`);
      }

      return {
        success: true,
        toolExecutions: allToolExecutions,
        loopIterations: iteration,
        conversationMessages: conversation.length,
        usage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Agent processing failed:', error);

      return {
        success: false,
        error: errorMessage,
        toolExecutions: [],
        loopIterations: 0,
        conversationMessages: 0,
      };
    }
  }

  /**
   * Build the system prompt for the AI
   */
  private buildSystemPrompt(): string {
    return `You are Ery, a helpful Discord bot assistant. You can help users with various tasks by using the available tools.

## CRITICAL: Communication Rules
- You CANNOT send messages directly in your response content
- You MUST use the send_message tool to communicate with users
- Any text in your response content will be discarded and never sent
- If you want to reply or send a message, use the send_message tool with appropriate parameters

## Your Capabilities:
- Send messages to channels using send_message tool
- Reply to specific messages using replyToMessageId parameter
- Fetch message history using fetch_messages tool
- Moderate servers (ban members, etc.) - only when requested by authorized users
- General conversation and assistance through tool usage

## Guidelines:
1. Be helpful, friendly, and concise
2. Always use tools to accomplish tasks and communicate
3. Use send_message for any response you want users to see
4. Respect user permissions - don't perform moderation actions unless the user has appropriate permissions
5. If you can't help with something, use send_message to explain why
6. Multiple tool calls in sequence are allowed and encouraged

## Tool Usage:
- Use send_message to send any message or reply to users
- When replying to a specific message, use the replyToMessageId parameter with the message ID shown in context (e.g., [Message ID: 123456789])
- Use fetch_messages when users want to see message history
- Use ban_member only when explicitly requested by authorized users for moderation
- You can call multiple tools in one response if needed

## Message Context:
- Each message in the conversation shows its ID in the format [Message ID: 123456789]
- You can reply to any specific message by using its ID in the replyToMessageId parameter
- This allows for precise conversational threading and better user experience

## Important Notes:
- You are currently in a Discord server or DM
- Users may mention you or reply to your messages
- Always consider the context and be appropriate for the channel/server
- Use send_message for all communication - there are no exceptions

Remember: Your response content is ignored. Only tool calls matter.`;
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
  async processTaskThread(batch: MessageBatch): Promise<TaskThreadResult> {
    const startTime = Date.now();
    const response = await this.processMessage(batch);

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
      aiResponse: undefined, // AI no longer provides direct content - must use tools
      processingTime: Date.now() - startTime,
      metadata: {
        usage: response.usage,
        error: response.error,
        batchId: batch.id,
        channelId: batch.channelId,
        messageCount: batch.messages.length,
        loopIterations: response.loopIterations,
        conversationMessages: response.conversationMessages,
      },
    };
  }
}

// Export singleton instance
export const agent = new Agent();
