import OpenAI from "openai";
import type {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import type { MessageBatch } from "../../taskThreads/types";
import type { Message } from "discord.js";
import type { ToolExecutionResult } from "../../tools/base/ToolExecutor";

export interface AIResponse {
  content?: string;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ProcessingContext {
  batch: MessageBatch;
  availableTools: ChatCompletionTool[];
  systemPrompt: string;
  conversationHistory?: ChatCompletionMessageParam[];
}

export class OpenRouterProvider {
  private client!: OpenAI;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!config.ai.apiKey) {
      logger.warn(
        "OpenRouter API key not configured - AI features will be disabled"
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: config.ai.apiKey,
        baseURL: config.ai.baseURL,
        defaultHeaders: {
          "HTTP-Referer": config.ai.siteUrl || undefined,
          "X-Title": config.ai.siteName,
        },
      });

      this.isConfigured = true;
      logger.info(
        `OpenRouter provider initialized with model: ${config.ai.model}`
      );
    } catch (error) {
      logger.error("Failed to initialize OpenRouter provider:", error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if the provider is properly configured
   */
  isReady(): boolean {
    return this.isConfigured && !!this.client;
  }

  /**
   * Process a message batch and return AI response
   */
  async processContext(context: ProcessingContext): Promise<AIResponse> {
    if (!this.isReady()) {
      throw new Error("OpenRouter provider is not configured");
    }

    try {
      const messages = this.buildMessages(context);
      const model = this.selectModel(context);

      logger.debug(
        `Processing with model ${model}, ${messages.length} messages, ${context.availableTools.length} tools`
      );

      const completion = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        tools:
          context.availableTools.length > 0
            ? context.availableTools
            : undefined,
        tool_choice: context.availableTools.length > 0 ? "auto" : undefined,
        temperature: config.ai.temperature,
        max_tokens: config.ai.maxTokens,
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error("No response choices returned from AI");
      }

      const response: AIResponse = {
        content: choice.message.content || undefined,
        toolCalls: choice.message.tool_calls?.map((call) => ({
          id: call.id,
          type: call.type,
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        })),
        finishReason: choice.finish_reason || "unknown",
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };

      logger.debug(
        `AI response: ${response.content ? "content" : "no content"}, ${
          response.toolCalls?.length || 0
        } tool calls`
      );

      return response;
    } catch (error) {
      logger.error("OpenRouter API call failed:", error);

      // Try fallback model if primary fails
      if (
        config.ai.fallbackModel &&
        config.ai.fallbackModel !== config.ai.model
      ) {
        logger.info(`Retrying with fallback model: ${config.ai.fallbackModel}`);
        return this.processWithFallback(context);
      }

      throw error;
    }
  }

  /**
   * Continue conversation with tool results
   */
  async continueConversation(
    conversationHistory: ChatCompletionMessageParam[],
    availableTools: ChatCompletionTool[]
  ): Promise<AIResponse> {
    if (!this.isReady()) {
      throw new Error("OpenRouter provider is not configured");
    }

    try {
      const model = config.ai.model;

      logger.debug(
        `Continuing conversation with model ${model}, ${conversationHistory.length} messages, ${availableTools.length} tools`
      );

      const completion = await this.client.chat.completions.create({
        model: model,
        messages: conversationHistory,
        tools: availableTools.length > 0 ? availableTools : undefined,
        tool_choice: availableTools.length > 0 ? "auto" : undefined,
        temperature: config.ai.temperature,
        max_tokens: config.ai.maxTokens,
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error("No response choices returned from AI");
      }

      const response: AIResponse = {
        content: choice.message.content || undefined,
        toolCalls: choice.message.tool_calls?.map((call) => ({
          id: call.id,
          type: call.type,
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        })),
        finishReason: choice.finish_reason || "unknown",
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };

      logger.debug(
        `AI response: ${response.content ? "content" : "no content"}, ${
          response.toolCalls?.length || 0
        } tool calls`
      );

      return response;
    } catch (error) {
      logger.error("OpenRouter API call failed:", error);
      throw error;
    }
  }

  /**
   * Build messages array for AI processing
   */
  private buildMessages(
    context: ProcessingContext
  ): ChatCompletionMessageParam[] {
    // If we have conversation history, use it instead of building from batch
    if (context.conversationHistory) {
      return [...context.conversationHistory];
    }

    const messages: ChatCompletionMessageParam[] = [];

    // Add system prompt
    messages.push({
      role: "system",
      content: context.systemPrompt,
    });

    // Add message history from batch (in chronological order)
    const sortedMessages = [...context.batch.messages].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    for (const message of sortedMessages) {
      // Skip bot messages to avoid confusion
      if (message.author.bot) continue;

      const content = this.formatMessageContent(message);
      if (content.trim().length === 0) continue;

      messages.push({
        role: "user",
        content: `${message.author.username}: ${content}`,
      });
    }

    return messages;
  }

  /**
   * Build initial conversation from message batch
   */
  buildInitialConversation(
    batch: MessageBatch,
    systemPrompt: string
  ): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    // Add system prompt
    messages.push({
      role: "system",
      content: systemPrompt,
    });

    // Add message history from batch (in chronological order)
    const sortedMessages = [...batch.messages].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    for (const message of sortedMessages) {
      // Skip bot messages to avoid confusion
      if (message.author.bot) continue;

      const content = this.formatMessageContent(message);
      if (content.trim().length === 0) continue;

      messages.push({
        role: "user",
        content: `${message.author.username}: ${content}`,
      });
    }

    return messages;
  }

  /**
   * Add tool call and results to conversation history
   */
  addToolCallToConversation(
    conversation: ChatCompletionMessageParam[],
    toolCalls: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>,
    toolResults: ToolExecutionResult[]
  ): ChatCompletionMessageParam[] {
    const updatedConversation = [...conversation];

    // Add assistant message with tool calls
    updatedConversation.push({
      role: "assistant",
      content: null,
      tool_calls: toolCalls.map((call) => ({
        id: call.id,
        type: call.type,
        function: call.function,
      })),
    });

    // Add tool result messages
    for (const result of toolResults) {
      const toolCall = toolCalls.find((call) => call.function.name === result.toolName);
      if (toolCall) {
        updatedConversation.push({
          role: "tool",
          content: this.formatToolResult(result),
          tool_call_id: toolCall.id,
        });
      }
    }

    return updatedConversation;
  }

  /**
   * Format tool execution result for AI consumption
   */
  private formatToolResult(result: ToolExecutionResult): string {
    if (result.success) {
      return JSON.stringify({
        success: true,
        data: result.data,
        executionTime: `${result.executionTimeMs}ms`,
      });
    } else {
      return JSON.stringify({
        success: false,
        error: result.error,
        executionTime: `${result.executionTimeMs}ms`,
      });
    }
  }

  /**
   * Format a Discord message for AI consumption
   */
  private formatMessageContent(message: Message): string {
    let content = message.content || "";

    // Add attachment information
    if (message.attachments?.size > 0) {
      const attachmentInfo = Array.from(message.attachments.values())
        .map((att) => `[Attachment: ${att.name}]`)
        .join(" ");
      content += ` ${attachmentInfo}`;
    }

    // Add embed information
    if (message.embeds?.length > 0) {
      content += ` [${message.embeds.length} embed(s)]`;
    }

    // Add reaction information
    if (message.reactions?.cache.size > 0) {
      const reactionInfo = Array.from(message.reactions.cache.values())
        .map(
          (reaction) => `${reaction.emoji.toString()}:${reaction.count}`
        )
        .join(" ");
      content += ` [Reactions: ${reactionInfo}]`;
    }

    return content;
  }

  /**
   * Select appropriate model based on context
   */
  private selectModel(context: ProcessingContext): string {
    // For now, use the configured model
    // Later we can add logic to select based on:
    // - Task complexity
    // - Available budget
    // - Response time requirements
    return config.ai.model;
  }

  /**
   * Retry with fallback model
   */
  private async processWithFallback(
    context: ProcessingContext
  ): Promise<AIResponse> {
    try {
      const messages = this.buildMessages(context);

      const completion = await this.client.chat.completions.create({
        model: config.ai.fallbackModel,
        messages: messages,
        tools:
          context.availableTools.length > 0
            ? context.availableTools
            : undefined,
        tool_choice: context.availableTools.length > 0 ? "auto" : undefined,
        temperature: config.ai.temperature,
        max_tokens: Math.min(config.ai.maxTokens, 1000), // Reduce tokens for fallback
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error("No response choices returned from fallback AI");
      }

      return {
        content: choice.message.content || undefined,
        toolCalls: choice.message.tool_calls?.map((call) => ({
          id: call.id,
          type: call.type,
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        })),
        finishReason: choice.finish_reason || "unknown",
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      logger.error("Fallback model also failed:", error);
      throw new Error("Both primary and fallback AI models failed");
    }
  }

  /**
   * Get model information
   */
  getModelInfo(): { primary: string; fallback: string; configured: boolean } {
    return {
      primary: config.ai.model,
      fallback: config.ai.fallbackModel,
      configured: this.isConfigured,
    };
  }
}
