// Export base classes and types
export * from './base';

// Export Discord tools
export { SendMessageTool } from './discord/communication/SendMessageTool';
export { BanMemberTool } from './discord/moderation/BanMemberTool';
export { KickMemberTool } from './discord/moderation/KickMemberTool';
export { TimeoutMemberTool } from './discord/moderation/TimeoutMemberTool';
export { DeleteMessageTool } from './discord/moderation/DeleteMessageTool';
export { BulkDeleteMessagesTool } from './discord/moderation/BulkDeleteMessagesTool';
export { FetchMessagesTool } from './discord/information/FetchMessagesTool';
export { ListInfoDocumentsTool } from './discord/information/ListInfoDocumentsTool';
export { ReadInfoDocumentTool } from './discord/information/ReadInfoDocumentTool';
export { GetMemberInfoTool } from './discord/information/GetMemberInfoTool';
export { GetServerInfoTool } from './discord/information/GetServerInfoTool';
export { GetChannelInfoTool } from './discord/information/GetChannelInfoTool';

// Tool registration
import { toolRegistry } from './base';
import { SendMessageTool } from './discord/communication/SendMessageTool';
import { BanMemberTool } from './discord/moderation/BanMemberTool';
import { KickMemberTool } from './discord/moderation/KickMemberTool';
import { TimeoutMemberTool } from './discord/moderation/TimeoutMemberTool';
import { DeleteMessageTool } from './discord/moderation/DeleteMessageTool';
import { BulkDeleteMessagesTool } from './discord/moderation/BulkDeleteMessagesTool';
import { FetchMessagesTool } from './discord/information/FetchMessagesTool';
import { ListInfoDocumentsTool } from './discord/information/ListInfoDocumentsTool';
import { ReadInfoDocumentTool } from './discord/information/ReadInfoDocumentTool';
import { GetMemberInfoTool } from './discord/information/GetMemberInfoTool';
import { GetServerInfoTool } from './discord/information/GetServerInfoTool';
import { GetChannelInfoTool } from './discord/information/GetChannelInfoTool';

/**
 * Register all available tools
 */
export function registerAllTools(): void {
  // Communication tools
  toolRegistry.register(new SendMessageTool());
  
  // Moderation tools
  toolRegistry.register(new BanMemberTool());
  toolRegistry.register(new KickMemberTool());
  toolRegistry.register(new TimeoutMemberTool());
  toolRegistry.register(new DeleteMessageTool());
  toolRegistry.register(new BulkDeleteMessagesTool());
  
  // Information tools
  toolRegistry.register(new FetchMessagesTool());
  toolRegistry.register(new ListInfoDocumentsTool());
  toolRegistry.register(new ReadInfoDocumentTool());
  toolRegistry.register(new GetMemberInfoTool());
  toolRegistry.register(new GetServerInfoTool());
  toolRegistry.register(new GetChannelInfoTool());
  
  console.log(`Registered ${toolRegistry.getAll().length} tools:`, toolRegistry.getNames());
}
