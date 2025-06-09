# System Patterns

## Architecture Overview

Ery follows an event-driven, task thread-based architecture designed for scalability and maintainability:

```
Discord API ←→ Event Handler ←→ Task Thread Manager ←→ Tool Executor
                     ↓                ↓                    ↓
                Database Layer ←→ Context Manager ←→ AI Agent
```

## Core Components

### Task Thread System

**One Thread Per Channel**: Each Discord channel can have one active task thread at a time:

- **Message Trigger**: Every message creates a new task thread if none is currently running
- **Context Loading**: Task threads receive recent message history as context
- **Tool Execution**: AI agent executes Discord tools based on context analysis
- **Parallel Processing**: Multiple task threads run simultaneously across different channels
- **Channel Isolation**: Each channel maintains independent thread state

```
Channel A Message → Task Thread A (with tools + context)
Channel B Message → Task Thread B (with tools + context)  
Channel A Message → Queued (Thread A still active)
```

### Message Processing Flow

1. **Message Batcher**: Intelligently groups messages using multiple triggers:
   - Message count threshold (default: 5 messages)
   - Time window expiry (default: 30 seconds)
   - Bot mention (immediate trigger)

2. **Task Thread Manager**: Orchestrates thread lifecycle and execution
   - Factory pattern for thread creation with state management
   - Ensures one thread per channel constraint
   - Manages thread cleanup and resource management

3. **AI Agent**: Processes context and determines actions
   - Loop-based processing with tool execution
   - Maintains conversation state throughout processing
   - Strategy pattern for different AI providers

### Tool System Architecture

**Command Pattern**: All Discord operations performed through standardized tools

**Available Tool Categories**:
- **Communication**: Send messages, replies, reactions
- **Moderation**: Ban, kick, mute, role management
- **Information**: Fetch messages, member info, server stats

**Tool Execution Pattern**:
```
AI Agent → Tool Selection → Permission Check → API Call → Result Logging
```

1. **Tool Discovery**: Registry automatically discovers available tools
2. **Function Schemas**: Auto-generated OpenAI-compatible schemas for AI
3. **Permission Validation**: Verify bot and user permissions
4. **Execution**: Discord API operations with error handling
5. **Context Update**: Results fed back to AI conversation state

## Data Patterns

### Database Schema
- **Task Threads**: Active thread state and execution history
- **Tool Executions**: Audit log of all tool usage (future)
- **Server Configuration**: Per-server settings and rules (future)

### Configuration Pattern
- **Hierarchical Config**: Global → Server → Channel → User (future)
- **Environment-Based**: Current config from environment variables
- **Hot Reload**: Configuration changes without restart (future)

## Integration Patterns

### Discord API Integration
- **Event-Driven**: React to Discord events (messages, joins, reactions)
- **Rate Limiting**: Handled automatically by discord.js
- **Error Handling**: Exponential backoff with graceful degradation

### AI Integration
- **OpenRouter Provider**: Flexible model selection with fallbacks
- **Context Processing**: Rich message history formatted for AI consumption
- **Function Calling**: OpenAI-compatible tool execution
- **Conversation State**: Maintained throughout processing loop

### Database Integration
- **Bun SQLite**: Built-in SQLite library for optimal performance
- **Drizzle ORM**: Type-safe database operations with migrations
- **Connection Pooling**: Efficient resource management

## Security Patterns

### Permission System
- **Role-Based Access**: Discord roles mapped to bot permissions
- **Tool Validation**: Input sanitization and permission checks
- **Audit Logging**: Complete trail of all bot actions

### Data Protection
- **Environment Variables**: Sensitive data in .env files
- **Type Safety**: TypeScript validation throughout system
- **Error Isolation**: Component failures don't cascade

## Performance Patterns

### Concurrency Management
- **Channel Isolation**: Independent processing prevents conflicts
- **Thread Limits**: Controlled resource usage per server
- **Automatic Cleanup**: Inactive threads cleaned up after 5 minutes

### Caching Strategy
- **In-Memory Cache**: Frequently accessed data cached locally
- **Context Caching**: Message history cached during thread lifecycle
- **Database Pooling**: Efficient connection reuse

### Scaling Considerations
- **Stateless Design**: Each task thread is independent
- **Resource Limits**: Configurable limits on concurrent threads
- **Database Sharding**: Future: partition data by server ID

## Key Architectural Decisions

### AI-First Design
- **Tool-Only Communication**: AI must use send_message tool to respond
- **Context-Rich Processing**: Full message history provided to AI
- **Loop-Based Execution**: AI processes until no more tools needed

### Event-Driven Architecture
- **Reactive Design**: System responds to Discord events
- **Loose Coupling**: Components communicate through events
- **Graceful Degradation**: System continues operating despite component failures

### Database-First Persistence
- **State Management**: All important state persisted to database
- **Migration System**: Version-controlled schema changes
- **Type Safety**: Database schema matches TypeScript types
