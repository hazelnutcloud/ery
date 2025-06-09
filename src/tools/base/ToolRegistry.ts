import { AgentTool } from "./AgentTool";
import { logger } from "../../utils/logger";
import type { PermissionResolvable } from "discord.js";
import type { ChatCompletionTool } from "openai/resources";

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();
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
   * Register an agent tool
   */
  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }

    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Get a tool by name
   */
  get(name: string): AgentTool | undefined {
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
  getAll(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
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
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();
