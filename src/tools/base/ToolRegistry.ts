import { Tool } from "./Tool";
import { logger } from "../../utils/logger";
import type { PermissionResolvable } from "discord.js";
import type { ChatCompletionTool } from "openai/resources";

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private static instance: ToolRegistry;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }

    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Register multiple tools
   */
  registerMany(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tools by category (based on permission requirements)
   */
  getByCategory(
    category: "moderation" | "communication" | "information" | "utility"
  ): Tool[] {
    return this.getAll().filter((tool) => {
      switch (category) {
        case "moderation":
          return tool.permissions.botPermissions.some((p) =>
            (
              [
                "BanMembers",
                "KickMembers",
                "ModerateMembers",
                "ManageMessages",
              ] as PermissionResolvable[]
            ).includes(p)
          );
        case "communication":
          return tool.permissions.botPermissions.some((p) =>
            (
              [
                "SendMessages",
                "AddReactions",
                "ManageThreads",
              ] as PermissionResolvable[]
            ).includes(p)
          );
        case "information":
          return tool.permissions.botPermissions.some((p) =>
            (
              ["ReadMessageHistory", "ViewChannel"] as PermissionResolvable[]
            ).includes(p)
          );
        case "utility":
          return !tool.permissions.botPermissions.some((p) =>
            (
              [
                "BanMembers",
                "KickMembers",
                "ModerateMembers",
                "ManageMessages",
                "SendMessages",
                "AddReactions",
              ] as PermissionResolvable[]
            ).includes(p)
          );
        default:
          return false;
      }
    });
  }

  /**
   * Get tools that can be used in DMs
   */
  getDMCompatible(): Tool[] {
    return this.getAll().filter((tool) => tool.permissions.allowInDMs);
  }

  /**
   * Get tools that require admin permissions
   */
  getAdminOnly(): Tool[] {
    return this.getAll().filter((tool) => tool.permissions.adminOnly);
  }

  /**
   * Get function calling schemas for AI integration
   */
  getFunctionSchemas(): ChatCompletionTool[] {
    return this.getAll().map((tool) => tool.getFunctionSchema());
  }

  /**
   * Get function calling schemas filtered by context
   */
  getFunctionSchemasForContext(
    hasGuild: boolean,
    isAdmin: boolean = false
  ): ChatCompletionTool[] {
    return this.getAll()
      .filter((tool) => {
        // Filter DM-only tools if in guild
        if (!hasGuild && !tool.permissions.allowInDMs) {
          return false;
        }

        // Filter admin-only tools if not admin
        if (tool.permissions.adminOnly && !isAdmin) {
          return false;
        }

        return true;
      })
      .map((tool) => tool.getFunctionSchema());
  }

  /**
   * Clear all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
    logger.debug("Cleared all registered tools");
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const success = this.tools.delete(name);
    if (success) {
      logger.debug(`Unregistered tool: ${name}`);
    }
    return success;
  }

  /**
   * Get tool statistics
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    dmCompatible: number;
    adminOnly: number;
  } {
    const all = this.getAll();

    return {
      total: all.length,
      byCategory: {
        moderation: this.getByCategory("moderation").length,
        communication: this.getByCategory("communication").length,
        information: this.getByCategory("information").length,
        utility: this.getByCategory("utility").length,
      },
      dmCompatible: this.getDMCompatible().length,
      adminOnly: this.getAdminOnly().length,
    };
  }
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();
