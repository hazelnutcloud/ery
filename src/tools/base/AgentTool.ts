import type {
  Guild,
  GuildMember,
  TextChannel,
  DMChannel,
  NewsChannel,
  VoiceChannel,
  PermissionResolvable,
  PublicThreadChannel,
  PrivateThreadChannel,
  PartialDMChannel,
  PartialGroupDMChannel,
} from "discord.js";
import { ChannelType } from "discord.js";
import type { ChatCompletionTool } from "openai/resources";
import type { BatchTrigger } from "../../taskThreads/types";

// Agent execution context - represents the environment where the agent operates
export interface AgentExecutionContext {
  // Channel where the agent is operating
  channel:
    | TextChannel
    | DMChannel
    | NewsChannel
    | PublicThreadChannel
    | PrivateThreadChannel
    | PartialDMChannel
    | PartialGroupDMChannel;

  // Guild context (undefined for DMs)
  guild?: Guild;

  // The bot's member in the guild (for permission checks)
  botMember?: GuildMember;

  // Batch information for context
  batchInfo: {
    id: string;
    messageCount: number;
    triggerType: BatchTrigger;
    channelId: string;
    guildId: string;
  };
}

// Tool parameter definition
export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "user" | "channel" | "role";
  description: string;
  required: boolean;
  choices?: string[];
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

// Agent tool permissions - what the bot needs to execute the tool
export interface AgentToolPermissions {
  botPermissions: PermissionResolvable[];
  allowInDMs: boolean;
}

// Abstract base class for all agent tools
export abstract class AgentTool {
  public readonly name: string;
  public readonly description: string;
  public readonly parameters: ToolParameter[];
  public readonly permissions: AgentToolPermissions;

  constructor(
    name: string,
    description: string,
    parameters: ToolParameter[] = [],
    permissions: AgentToolPermissions
  ) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.permissions = permissions;
  }

  /**
   * Validate that the agent can execute this tool in the current context
   */
  async validateExecution(
    context: AgentExecutionContext
  ): Promise<{ canExecute: boolean; reason?: string }> {
    // Check if DMs are allowed
    if (!context.guild && !this.permissions.allowInDMs) {
      return {
        canExecute: false,
        reason: "This tool cannot be used in direct messages",
      };
    }

    // Check bot permissions in guild context
    if (context.guild && context.botMember) {
      // Check guild-level permissions
      for (const permission of this.permissions.botPermissions) {
        if (!context.botMember.permissions.has(permission)) {
          return {
            canExecute: false,
            reason: `Bot missing permission: ${permission.toString()}`,
          };
        }
      }

      // Check channel-specific permissions (only for guild channels)
      if (!context.channel.isDMBased()) {
        const channelPermissions = context.botMember.permissionsIn(
          context.channel
        );
        for (const permission of this.permissions.botPermissions) {
          if (!channelPermissions.has(permission)) {
            return {
              canExecute: false,
              reason: `Bot missing channel permission: ${permission.toString()}`,
            };
          }
        }
      }
    }

    return { canExecute: true };
  }

  /**
   * Validate tool parameters
   */
  validateParameters(params: Record<string, unknown>): {
    valid: boolean;
    error?: string;
  } {
    // Check required parameters
    for (const param of this.parameters) {
      if (param.required && !(param.name in params)) {
        return {
          valid: false,
          error: `Missing required parameter: ${param.name}`,
        };
      }
    }

    // Validate parameter types and values
    for (const [key, value] of Object.entries(params)) {
      const param = this.parameters.find((p) => p.name === key);
      if (!param) {
        return { valid: false, error: `Unknown parameter: ${key}` };
      }

      // Type validation
      const valid = this.validateParameterType(value, param);
      if (!valid) {
        return {
          valid: false,
          error: `Invalid type for parameter ${key}: expected ${param.type}`,
        };
      }

      // Choice validation
      if (param.choices && !param.choices.includes(String(value))) {
        return {
          valid: false,
          error: `Invalid value for ${key}: must be one of ${param.choices.join(
            ", "
          )}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate a single parameter type
   */
  private validateParameterType(value: unknown, param: ToolParameter): boolean {
    switch (param.type) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" || !isNaN(Number(value));
      case "boolean":
        return (
          typeof value === "boolean" || value === "true" || value === "false"
        );
      case "user":
        // Validate Discord user ID format
        return typeof value === "string" && /^\d{17,19}$/.test(value);
      case "channel":
        // Validate Discord channel ID format
        return typeof value === "string" && /^\d{17,19}$/.test(value);
      case "role":
        // Validate Discord role ID format
        return typeof value === "string" && /^\d{17,19}$/.test(value);
      default:
        return false;
    }
  }

  /**
   * Get function calling schema for AI integration
   */
  getFunctionSchema(): ChatCompletionTool {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const param of this.parameters) {
      properties[param.name] = {
        type: this.getJsonSchemaType(param.type),
        description: param.description,
      };

      if (param.choices) {
        properties[param.name].enum = param.choices;
      }

      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: "object",
          properties,
          required,
        },
      },
    };
  }

  /**
   * Convert tool parameter type to JSON schema type
   */
  private getJsonSchemaType(toolType: string): string {
    switch (toolType) {
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      default:
        return "string";
    }
  }

  /**
   * Execute the tool with given parameters
   */
  abstract execute(
    context: AgentExecutionContext,
    parameters: Record<string, unknown>
  ): Promise<ToolResult>;
}
