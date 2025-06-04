# System Patterns

## Architecture Overview

Ery follows an event-driven, task thread-based architecture designed for scalability and maintainability:

```
Discord API ←→ Event Handler ←→ Task Thread Manager ←→ Tool Executor
                     ↓                ↓                    ↓
                Database Layer ←→ Context Manager ←→ AI Agent
                     ↓
                Learning Engine
```

### Task Thread System

Ery operates using a **task thread** system where each Discord channel can have one active task thread at a time:

- **Message Trigger**: Every message sent to a Discord channel creates a new task thread if none is currently running
- **Context Loading**: Task threads receive the last N messages within a given timeframe as context
- **Tool Execution**: Each task thread has access to multiple tools for Discord operations
- **Parallel Processing**: Multiple task threads can run simultaneously across different channels
- **Channel Isolation**: Each Discord channel can only have one active task thread at a time

```
Channel A Message → Task Thread A (with tools + context)
Channel B Message → Task Thread B (with tools + context)
Channel A Message → Queued (Thread A still active)
Channel C Message → Task Thread C (with tools + context)
```

## Core Components

### Task Thread Manager
- **Purpose**: Orchestrate task thread lifecycle and execution
- **Pattern**: Factory pattern for thread creation with state management
- **Responsibilities**:
  - Create new task threads when messages arrive
  - Ensure one thread per channel constraint
  - Manage thread lifecycle and cleanup
  - Queue messages when threads are active
  - Coordinate parallel thread execution

### Context Manager
- **Purpose**: Provide relevant context to task threads
- **Pattern**: Strategy pattern for different context types
- **Responsibilities**:
  - Fetch last N messages within timeframe
  - Filter and format context for AI consumption
  - Manage context caching and updates
  - Handle context size limitations

### Tool Executor
- **Purpose**: Execute tools within task thread context
- **Pattern**: Command pattern with validation and logging
- **Responsibilities**:
  - Validate tool permissions and parameters
  - Execute Discord API operations
  - Log all tool executions for audit
  - Handle tool failures and retries

### Event Handler
- **Purpose**: Central hub for all Discord events
- **Pattern**: Observer pattern for event distribution
- **Responsibilities**: 
  - Receive Discord events (messages, joins, reactions, etc.)
  - Trigger task thread creation for new messages
  - Route events to appropriate handlers
  - Handle error recovery and reconnection

### AI Agent
- **Purpose**: Process context and determine actions within task threads
- **Pattern**: Strategy pattern for different AI providers
- **Responsibilities**:
  - Analyze message context and server state
  - Determine appropriate tools to execute
  - Generate responses and moderation actions
  - Learn from interactions and outcomes

### Feature Modules

#### Moderation Module
- **Pattern**: Strategy pattern for different moderation actions
- **Components**:
  - Rule Engine: Configurable rule evaluation
  - Action Executor: Ban, kick, mute, delete operations
  - Appeal System: Handle moderation appeals

#### Community Module
- **Pattern**: Factory pattern for activity creation
- **Components**:
  - Event Manager: Schedule and run community events
  - Poll System: Create and manage polls
  - Engagement Tracker: Monitor community participation

#### Learning Module
- **Pattern**: Adapter pattern for different AI providers
- **Components**:
  - Context Analyzer: Understand server culture and patterns
  - Response Generator: Create contextual responses
  - Feedback Processor: Learn from user interactions

## Tool System

### Available Tools

Task threads have access to a comprehensive set of tools for Discord operations:

#### Core Discord Tools
- **fetch_messages**: Retrieve messages from Discord API with filtering options
- **send_message**: Send messages to the current task thread channel
- **edit_message**: Modify existing messages
- **delete_message**: Remove messages from channels
- **add_reaction**: Add emoji reactions to messages
- **remove_reaction**: Remove emoji reactions from messages

#### Moderation Tools
- **ban_member**: Ban users from the server with optional reason and duration
- **kick_member**: Remove users from the server temporarily
- **timeout_member**: Apply timeout/mute to users
- **warn_member**: Issue warnings to users with logging
- **manage_roles**: Add or remove roles from members
- **manage_permissions**: Modify channel or server permissions

#### Information Tools
- **get_member_info**: Retrieve detailed member information
- **get_server_info**: Access server configuration and statistics
- **get_channel_info**: Fetch channel details and permissions
- **search_messages**: Search through message history with filters
- **get_audit_logs**: Access server audit log entries

#### Utility Tools
- **create_invite**: Generate server invite links
- **manage_channels**: Create, modify, or delete channels
- **schedule_action**: Schedule future moderation actions
- **send_dm**: Send direct messages to users
- **create_thread**: Create discussion threads
- **pin_message**: Pin important messages to channels

### Tool Execution Pattern

```
Task Thread → Tool Request → Permission Check → API Call → Result Logging
```

1. **Tool Selection**: AI agent determines appropriate tools based on context
2. **Permission Validation**: Verify bot and user permissions for the tool
3. **Parameter Validation**: Ensure all required parameters are present and valid
4. **Execution**: Perform the Discord API operation (discord.js handles rate limiting)
5. **Result Handling**: Process success/failure and log outcomes
6. **Context Update**: Update task thread context with results

## Data Patterns

### Database Schema Design
- **Users**: Discord user data and preferences
- **Servers**: Server-specific configuration and rules
- **Moderation_Logs**: Record of all moderation actions
- **Learning_Data**: Contextual information for AI improvement
- **Task_Threads**: Active thread state and execution history
- **Tool_Executions**: Audit log of all tool usage

### Configuration Pattern
- **Hierarchical Config**: Global → Server → Channel → User
- **Hot Reload**: Configuration changes without restart
- **Validation**: Schema validation for all config changes

## Integration Patterns

### Discord API Integration
- **Error Handling**: Exponential backoff with circuit breaker
- **Webhook Support**: For external integrations

### Database Integration
- **Bun SQLite**: Use Bun's builtin SQLite library for database operations
- **Connection Pooling**: Efficient database connections
- **Migration System**: Version-controlled schema changes
- **Backup Strategy**: Automated backups with retention

## Security Patterns

### Permission System
- **Role-Based Access**: Discord roles mapped to bot permissions
- **Command Validation**: Input sanitization and validation
- **Audit Logging**: Complete audit trail of actions

### Data Protection
- **Encryption**: Sensitive data encrypted at rest
- **Privacy Controls**: User data deletion and export
- **Compliance**: GDPR and Discord ToS compliance

## Performance Patterns

### Caching Strategy
- **Memory Cache**: In-memory caching for frequently accessed data
- **Cache Invalidation**: Event-driven cache updates
- **Preloading**: Anticipatory loading of frequently accessed data

### Scaling Patterns
- **Horizontal Scaling**: Multiple bot instances with load balancing
- **Database Sharding**: Partition data by server ID
- **CDN Integration**: Static assets served via CDN
