# Active Context

## Current Work Focus

**Agent Mechanics Refactored with Loop-Based Processing**: Successfully refactored the Agent to use a loop-based approach where:
- Agent receives AI response with tool calls
- Executes all tools and collects results  
- Sends tool results back to AI as conversation context
- Repeats until AI has no more tool calls
- AI content is discarded - only tool calls matter
- AI must use send_message tool to communicate with users

## Recent Changes

- **AI Context Building Refactored**: Bot messages are now included in conversation history as "assistant" role messages instead of being filtered out, preserving important context
- **Message ID Context Integration**: All messages in conversation history now include their Discord message IDs in format [Message ID: 123456789] allowing AI to target specific messages for replies
- **Send Message Tool Enhanced**: Replaced `reply` boolean parameter with `replyToMessageId` string parameter allowing AI to reply to any specific message by ID instead of only the trigger message
- **System Prompt Updated**: Enhanced system prompt to inform AI about message ID availability and precise reply targeting capabilities
- **Dependencies Installed**: discord.js, discord-api-types, drizzle-orm, drizzle-kit (using Bun's native SQLite)
- **Database Schema Created**: Complete schema for all tables including task threads, tools, users, servers, moderation
- **Database Connection**: Implemented with Bun SQLite, now uses drizzle-orm migrations
- **Database Migrations**: 
  - Set up drizzle-kit for generating and managing migrations
  - Created initial migration from schema (0000_tricky_ultimo.sql)
  - Added indices directly to drizzle schemas
  - Generated additional migrations for indices (0001_gorgeous_lily_hollister.sql, 0002_odd_skreet.sql)
  - Database initialization runs all migrations automatically
  - Removed legacy table creation functions
  - Created migration scripts and npm commands
  - All indices now managed through drizzle-kit migrations
- **TypeScript Types for JSON Columns**: Added proper TypeScript types to all text columns with mode: "json"
  - **Created Comprehensive Type Definitions**: Added `src/database/types.ts` with complete type definitions for all JSON columns
  - **Server Types**: `ServerConfig`, `ModerationRule[]`, `ServerFeatures`, `CustomResponses`, `ChannelConfig`, `ChannelPermissions`
  - **Task Thread Types**: `TaskThreadResult`, `ToolParameters`, `ToolResult` (plus existing `MessageBatch`)
  - **Moderation Types**: `ModerationMetadata`
  - **User Types**: `UserCustomData`
  - **Updated All Schemas**: Applied proper `.$type<>()` annotations to all JSON columns in all table schemas
  - **Fixed TaskThreadManager**: Updated to work with typed JSON columns (automatic serialization/deserialization)
  - **No Database Migration Required**: Type annotations are compile-time only, no schema changes needed
- **Major Codebase Cleanup**: Removed all unused components to simplify development
  - **Removed Unused Database Tables**: Deleted servers, moderation, users tables and toolExecutions
  - **Removed Unused Schema Files**: Deleted src/database/schema/servers.ts, moderation.ts, users.ts
  - **Cleaned Up Types**: Removed all unused types from src/database/types.ts, kept only task thread related types
  - **Removed ContextManager**: Deleted src/taskThreads/contextManager.ts as it's not being used yet
  - **Updated Imports**: Fixed TaskThreadManager to only import used tables
  - **Generated Migration**: Created migration 0003_simple_hercules.sql to drop unused tables from existing databases
  - **Verified Functionality**: All migrations run successfully and code compiles correctly
- **Configuration System**: Created config with Discord, database, task thread, and AI settings
- **Core Utilities**: Logger with colored output, UUID generator, composite ID utilities
- **Discord Client**: Bot client with all required intents and partials
- **Task Thread System Refactored with Message Batching**:
  - **New Types**: Added MessageBatch, BatchTrigger, MessageQueue interfaces
  - **MessageBatcher**: Handles message queuing and batch creation with 3 triggers:
    1. Message count threshold (configurable, default: 5 messages)
    2. Time window expiry (configurable, default: 30 seconds)
    3. Bot mention (immediate trigger)
  - **Parallel Processing**: Multiple task threads can run per channel simultaneously
  - **No Message Overlap**: Each batch contains unique messages, no overlapping between batches
  - **TaskThreadManager**: Refactored to spawn threads from batches instead of individual messages
  - **ContextManager**: Updated to work with message batches instead of single trigger messages
  - **Configuration**: Added batch-specific settings (batchMessageCount, batchTimeWindowMs, etc.)
- **Event Handlers**: Ready event (sets presence) and messageCreate (creates task threads)
- **Main Entry Point**: index.ts with graceful shutdown handling
- **Architecture Refactoring - Circular Dependency Removal**:
  - **MessageManager**: Created high-level coordinator class that manages both MessageBatcher and TaskThreadManager
  - **Event-Driven Communication**: MessageBatcher now extends EventEmitter and emits 'batchReady' events instead of directly calling TaskThreadManager
  - **Clean Separation**: Removed circular imports between MessageBatcher and TaskThreadManager
  - **Centralized Control**: MessageManager handles all message processing workflow and provides unified API
  - **Graceful Shutdown**: MessageManager.shutdown() properly cleans up all resources and event listeners
  - **Updated Entry Points**: All components now use MessageManager instead of direct TaskThreadManager access

## Current State

### What Exists
- Complete project structure with TypeScript configuration
- Database schema and connection with migration-based initialization
- Drizzle-kit integration for database migrations
- Core task thread system with context fetching
- Basic Discord bot that connects and responds to messages
- Event-driven architecture with message handling
- Logging system with configurable levels
- Environment configuration template
- Migration scripts and database management commands

### What's Missing
- Tool system implementation (Discord API wrappers)
- AI agent integration for processing task threads
- Moderation module (ban, kick, timeout, etc.)
- Community module (events, polls, engagement)
- Interaction module (conversational AI, queries)
- Actual task thread processing logic
- Tool execution framework

## Next Steps

1. **Create Tool System Base**: Implement tool types and execution framework
2. **Implement Discord Tools**: Create wrappers for all Discord API operations
3. **AI Agent Stub**: Create placeholder AI processing that can execute tools
4. **Test Basic Flow**: Verify message → thread → tool execution pipeline
5. **Moderation Tools**: Implement ban_member, kick_member, timeout_member, etc.
6. **Interaction Tools**: Implement send_message, add_reaction, create_thread, etc.
7. **Information Tools**: Implement fetch_messages, get_member_info, search_messages, etc.

## Active Decisions and Considerations

### Architecture Decisions
- **Bun Native SQLite**: Using Bun's built-in SQLite instead of better-sqlite3
- **No dotenv**: Leveraging Bun's automatic .env file loading
- **Type-Safe Imports**: Using `type` imports for TypeScript types per verbatimModuleSyntax
- **Channel Type Checking**: Handling both guild channels and DMs properly
- **Memory + Database**: Hybrid approach with in-memory cache and persistent storage
- **Cleanup Interval**: 1-minute interval to clean up inactive threads (5-minute timeout)

### Development Preferences
- **Incremental Testing**: Build and test each component before moving to the next
- **Type Safety First**: Ensuring all Discord API interactions are properly typed
- **Error Resilience**: Comprehensive error handling at every level
- **Modular Tools**: Each tool is independent and can be tested separately

## Important Patterns and Insights

### Task Thread Flow
1. Message received → Check thread limits
2. Create/get active thread for channel
3. Fetch context (recent messages)
4. Process with AI (TODO)
5. Execute tools based on AI decisions (TODO)
6. Complete thread with results

### Context Management
- Fetches up to 20 messages within 30-minute window
- Includes message metadata (attachments, mentions, links)
- Formats context for AI consumption
- Handles both text channels and DMs

### Thread Lifecycle
- One active thread per channel at a time
- 5-minute timeout for inactive threads
- Automatic cleanup every minute
- Thread state persisted to database

## Current Challenges

1. **AI Integration**: Need to decide on AI provider integration approach
2. **Tool Permission System**: Ensuring bot has permissions before executing tools
3. **Rate Limiting**: Discord.js handles this, but need to monitor
4. **Testing Strategy**: How to test tool execution without affecting real servers
5. **Error Recovery**: Handling partial tool execution failures

## Learning and Project Insights

- Bun's built-in SQLite is performant and reduces dependencies
- Discord.js v14 has excellent TypeScript support
- Task thread pattern provides good isolation and concurrency control
- Context window of 20 messages seems reasonable for most moderation decisions
- Need to carefully handle permissions for each Discord operation
