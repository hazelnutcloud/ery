import type {
  Message,
  GuildMember,
  TextChannel,
  DMChannel,
  NewsChannel,
  VoiceChannel,
  PermissionResolvable,
} from "discord.js";
import { ChannelType } from "discord.js";
import type { ChatCompletionTool } from "openai/resources";

// Tool execution context
export interface ToolContext {
  message: Message;
  channel: Message["channel"];
  guild?: Message["guild"];
  member?: GuildMember;
  author: Message["author"];
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

// Tool permission requirements
export interface ToolPermissions {
  botPermissions: PermissionResolvable[];
  userPermissions?: PermissionResolvable[];
  allowInDMs: boolean;
  adminOnly?: boolean;
}

// Abstract base class for all tools
export abstract class Tool {
  public readonly name: string;
  public readonly description: string;
  public readonly parameters: ToolParameter[];
  public readonly permissions: ToolPermissions;

  constructor(
    name: string,
    description: string,
    parameters: ToolParameter[] = [],
    permissions: ToolPermissions
  ) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.permissions = permissions;
  }

  /**
   * Validate that the tool can be executed in the current context
   */
  async validateContext(
    context: ToolContext
  ): Promise<{ valid: boolean; error?: string }> {
    // Check if DMs are allowed
    if (!context.guild && !this.permissions.allowInDMs) {
      return {
        valid: false,
        error: "This tool cannot be used in direct messages",
      };
    }

    // Check bot permissions
    if (context.guild && context.channel.type !== ChannelType.DM) {
      const botMember = context.guild.members.me;
      if (!botMember) {
        return { valid: false, error: "Bot member not found in guild" };
      }

      for (const permission of this.permissions.botPermissions) {
        if (!botMember.permissions.has(permission)) {
          return {
            valid: false,
            error: `Bot missing permission: ${permission}`,
          };
        }
      }

      // Check channel-specific permissions (only for guild channels)
      if ("guild" in context.channel && context.channel.guild) {
        const channelPermissions = botMember.permissionsIn(context.channel);
        for (const permission of this.permissions.botPermissions) {
          if (!channelPermissions.has(permission)) {
            return {
              valid: false,
              error: `Bot missing channel permission: ${permission}`,
            };
          }
        }
      }
    }

    // Check user permissions if specified
    if (this.permissions.userPermissions && context.member) {
      for (const permission of this.permissions.userPermissions) {
        if (!context.member.permissions.has(permission)) {
          return {
            valid: false,
            error: `User missing permission: ${permission}`,
          };
        }
      }
    }

    // Check admin requirements
    if (this.permissions.adminOnly && context.member) {
      const hasAdminPermission =
        context.member.permissions.has("Administrator");

      if (!hasAdminPermission) {
        return {
          valid: false,
          error: "This tool requires administrator privileges",
        };
      }
    }

    return { valid: true };
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
    context: ToolContext,
    parameters: Record<string, unknown>
  ): Promise<ToolResult>;
}
