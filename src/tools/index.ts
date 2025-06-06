// Export base classes and types
export * from './base';

// Export Discord tools
export { SendMessageTool } from './discord/communication/SendMessageTool';
export { BanMemberTool } from './discord/moderation/BanMemberTool';
export { FetchMessagesTool } from './discord/information/FetchMessagesTool';

// Tool registration
import { toolRegistry } from './base';
import { SendMessageTool } from './discord/communication/SendMessageTool';
import { BanMemberTool } from './discord/moderation/BanMemberTool';
import { FetchMessagesTool } from './discord/information/FetchMessagesTool';

/**
 * Register all available tools
 */
export function registerAllTools(): void {
  // Communication tools
  toolRegistry.register(new SendMessageTool());
  
  // Moderation tools
  toolRegistry.register(new BanMemberTool());
  
  // Information tools
  toolRegistry.register(new FetchMessagesTool());
  
  console.log(`Registered ${toolRegistry.getAll().length} tools:`, toolRegistry.getNames());
}
