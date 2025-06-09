import {
  OpenRouterProvider,
  type AIResponse,
  type ProcessingContext,
} from "./providers/OpenRouterProvider";
import {
  toolExecutor,
  toolRegistry,
  type AgentExecutionContext,
  type ToolExecutionResult,
} from "../tools";
import { logger } from "../utils/logger";
import type { MessageBatch } from "../taskThreads/types";
import type { TaskThreadResult } from "../database/types";
import { agentLogger } from "../services/AgentLogger";

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
    this.systemPrompt = this.buildSystemPrompt(); // Fixed: Added 'this.'
  }

  /**
   * Process a message batch using loop-based approach
   */
  async processThread(
    threadId: string,
    batch: MessageBatch
  ): Promise<TaskThreadResult> {
    logger.info(
      `Agent processing thread ${threadId} for channel ${batch.channelId}`
    );

    const maxIterations = 10;
    const maxProcessingTime = 30000; // 30 seconds
    const startTime = Date.now();

    // Log agent start
    await agentLogger.logAgentStart(
      threadId,
      batch.channelId,
      batch.guildId,
      batch.messages[0]?.author?.id // Assuming the first message author is the trigger
    );

    let agentResponse: AgentResponse;

    try {
      // Check if AI provider is ready
      if (!this.aiProvider.isReady()) {
        const error =
          "AI provider not configured. Please check your OpenRouter API key.";
        agentResponse = {
          success: false,
          error,
          toolExecutions: [],
          loopIterations: 0,
          conversationMessages: 0,
        };
      } else {
        // Use the last message in the batch for tool context
        const contextMessage = batch.messages[batch.messages.length - 1];
        if (!contextMessage) {
          const error = "No messages available in batch for processing";
          agentResponse = {
            success: false,
            error,
            toolExecutions: [],
            loopIterations: 0,
            conversationMessages: 0,
          };
        } else if (contextMessage.channel.isVoiceBased()) {
          const error = "Voice channels are not supported for agent processing";
          agentResponse = {
            success: false,
            error,
            toolExecutions: [],
            loopIterations: 0,
            conversationMessages: 0,
          };
        } else {
          // Create agent execution context from the context message
          const agentContext = toolExecutor.createAgentExecutionContext(
            batch,
            contextMessage.channel,
            contextMessage.guild ?? undefined
          );

          // Get available tools for this context
          const availableTools =
            await toolExecutor.getAvailableAgentFunctionSchemas(agentContext);

          // Build initial conversation
          let conversation = this.aiProvider.buildInitialConversation(
            batch,
            this.systemPrompt
          );
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
              logger.warn(
                `Agent processing timeout after ${maxProcessingTime}ms`
              );
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
              aiResponse = await this.aiProvider.processContext(
                processingContext
              );
            } else {
              // Subsequent iterations: use continueConversation
              aiResponse = await this.aiProvider.continueConversation(
                conversation,
                availableTools
              );
            }

            // Log AI response
            if (aiResponse.usage) {
              totalUsage.promptTokens += aiResponse.usage.promptTokens;
              totalUsage.completionTokens += aiResponse.usage.completionTokens;
              totalUsage.totalTokens += aiResponse.usage.totalTokens;
              await agentLogger.logAIResponse(
                threadId,
                batch.channelId,
                batch.guildId,
                aiResponse.model,
                aiResponse.usage
              );
            }

            // If no tool calls, we're done
            if (!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) {
              logger.debug(
                `No tool calls in iteration ${iteration}, ending loop`
              );
              break;
            }

            // Execute tool calls
            logger.debug(
              `Executing ${aiResponse.toolCalls.length} tool calls in iteration ${iteration}`
            );
            const iterationToolExecutions: ToolExecutionResult[] = [];

            for (const toolCall of aiResponse.toolCalls) {
              try {
                // Parse tool arguments
                const parameters = JSON.parse(toolCall.function.arguments);

                // Execute the tool
                const execution = await toolExecutor.executeAgentTool({
                  toolName: toolCall.function.name,
                  parameters,
                  context: agentContext,
                  threadId: threadId,
                });

                iterationToolExecutions.push(execution);
                allToolExecutions.push(execution);

                logger.debug(
                  `Tool ${toolCall.function.name} executed: ${
                    execution.success ? "success" : "failure"
                  }`
                );
              } catch (error) {
                logger.error(
                  `Failed to execute tool ${toolCall.function.name}:`,
                  error
                );
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

            logger.debug(
              `Iteration ${iteration} completed, conversation now has ${conversation.length} messages`
            );
          }

          if (iteration >= maxIterations) {
            logger.warn(
              `Agent processing stopped after reaching max iterations (${maxIterations})`
            );
          }

          agentResponse = {
            success: true,
            toolExecutions: allToolExecutions,
            loopIterations: iteration,
            conversationMessages: conversation.length,
            usage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
          };
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Agent processing failed:", error);

      agentResponse = {
        success: false,
        error: errorMessage,
        toolExecutions: [],
        loopIterations: 0,
        conversationMessages: 0,
      };
    }

    // Log agent completion
    await agentLogger.logAgentComplete(
      threadId,
      batch.channelId,
      batch.guildId,
      agentResponse.success,
      Date.now() - startTime,
      agentResponse.error,
      {
        loopIterations: agentResponse.loopIterations,
        conversationMessages: agentResponse.conversationMessages,
        totalToolExecutions: agentResponse.toolExecutions.length,
      }
    );

    if (!agentResponse.success) {
      await agentLogger.logError(
        threadId,
        batch.channelId,
        batch.guildId,
        agentResponse.error!,
        {
          stack:
            (agentResponse.error as any) instanceof Error
              ? (agentResponse.error as any).stack
              : undefined,
        } // Fixed: Cast to any
      );
    }

    // Generate summary
    const summary = agentResponse.success
      ? `Processed ${batch.messages.length} messages with ${agentResponse.toolExecutions.length} tool executions`
      : `Failed to process batch: ${agentResponse.error}`;

    // Convert tool executions to actions
    const actions = agentResponse.toolExecutions.map((exec) => ({
      type: "tool_execution",
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
      success: agentResponse.success,
      summary,
      actions,
      aiResponse: undefined, // AI no longer provides direct content - must use tools
      processingTime: Date.now() - startTime,
      metadata: {
        usage: agentResponse.usage,
        error: agentResponse.error,
        channelId: batch.channelId,
        messageCount: batch.messages.length,
        loopIterations: agentResponse.loopIterations,
        conversationMessages: agentResponse.conversationMessages,
      },
    };
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
- Access server information documents (FAQs, rules, documentation, guides)
- Moderate servers (ban members, etc.) - only when requested by authorized users
- General conversation and assistance through tool usage

## Server Information Documents - MANDATORY WORKFLOW:

### STEP 1: Discovery (ALWAYS FIRST)
- When users ask about server rules, policies, FAQs, or any server-specific information
- MUST use list_info_documents FIRST to see what's available
- Never assume what documents exist - always check first

### STEP 2: Retrieval (ONLY AFTER STEP 1)
- Use read_info_document to get specific content by exact document name
- Choose the most relevant document(s) based on user's question and available list
- If no relevant documents exist, inform the user clearly

### Document Types Include:
- Server rules and guidelines
- Frequently Asked Questions (FAQs)
- Documentation and guides
- Community guidelines
- Event information
- Any other reference material administrators have provided

## Information Retrieval Examples:

User asks: "What are the server rules?"
✅ CORRECT: list_info_documents → read_info_document("rules")
❌ WRONG: read_info_document("rules") directly

User asks: "How do I report a bug?"
✅ CORRECT: list_info_documents → check for FAQ/support docs → read relevant document
❌ WRONG: Guess document names without checking what exists

## Guidelines:
1. Be helpful, friendly, and concise
2. Always use tools to accomplish tasks and communicate
3. Use send_message for any response you want users to see
4. **MANDATORY: For server information questions, ALWAYS list_info_documents first, then read_info_document**
5. Respect user permissions - don't perform moderation actions unless the user has appropriate permissions
6. If you can't help with something, use send_message to explain why
7. Multiple tool calls in sequence are allowed and encouraged

## Tool Usage:
- Use send_message to send any message or reply to users
- When replying to a specific message, use the replyToMessageId parameter
- Use fetch_messages when users want to see message history
- **For server information: ALWAYS list_info_documents first, then read_info_document with exact names**
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
}

// Export singleton instance
export const agent = new Agent();
