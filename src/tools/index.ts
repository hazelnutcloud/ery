// Export base classes and types
export * from './base';

// Export Discord tools
export { SendMessageTool } from './discord/communication/SendMessageTool';
export { BanMemberTool } from './discord/moderation/BanMemberTool';
export { FetchMessagesTool } from './discord/information/FetchMessagesTool';
export { ListInfoDocumentsTool } from './discord/information/ListInfoDocumentsTool';
export { ReadInfoDocumentTool } from './discord/information/ReadInfoDocumentTool';

// Tool registration
import { toolRegistry } from './base';
import { SendMessageTool } from './discord/communication/SendMessageTool';
import { BanMemberTool } from './discord/moderation/BanMemberTool';
import { FetchMessagesTool } from './discord/information/FetchMessagesTool';
import { ListInfoDocumentsTool } from './discord/information/ListInfoDocumentsTool';
import { ReadInfoDocumentTool } from './discord/information/ReadInfoDocumentTool';

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
  toolRegistry.register(new ListInfoDocumentsTool());
  toolRegistry.register(new ReadInfoDocumentTool());
  
  console.log(`Registered ${toolRegistry.getAll().length} tools:`, toolRegistry.getNames());
}
