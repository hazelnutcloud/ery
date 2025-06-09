# Technical Context

## Technology Stack

### Runtime & Language
- **BunJS**: Fast JavaScript runtime with built-in SQLite support
- **TypeScript**: Type-safe development with modern JavaScript features
- **Node.js Ecosystem**: Compatible with existing npm packages

### Core Dependencies
- **discord.js**: Primary Discord API interaction library
- **discord-api-types**: TypeScript definitions for Discord API
- **drizzle-orm**: Type-safe SQL ORM with migration support
- **drizzle-kit**: Database migration management
- **openai**: AI integration (compatible with OpenRouter)

### Database
- **Neon Postgres**: Scalable, serverless PostgreSQL database
- **Drizzle ORM**: Type-safe operations with automatic migrations
- **Schema Management**: Version-controlled database changes
- **UUIDs**: Native PostgreSQL UUIDs for primary keys
- **JSONB**: Efficient storage and querying of JSON data

### Deployment
- **Docker**: Containerized deployment for consistency
- **fly.io**: Cloud platform for hosting and scaling
- **Environment Configuration**: .env-based configuration management

## Development Setup

### Prerequisites
- Bun v1.0+ installed
- TypeScript 5+ for development
- Discord bot token and OpenRouter API key for testing

### Commands
```bash
bun install              # Install dependencies
bun run src/index.ts     # Run development server
bun run db:generate      # Generate database migrations
bun run db:migrate       # Apply database migrations
```

### Dependency Management
- **Installation Pattern**: Use `bun install <package>` one-by-one
- **SQLite Integration**: Use Bun's built-in SQLite instead of external packages
- **Auto-Management**: Let Bun handle package.json updates automatically

## Current Project Structure
```
ery/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── ai/                         # AI integration
│   ├── bot/                        # Discord client
│   ├── config/                     # Configuration
│   ├── database/                   # Database and migrations
│   ├── events/                     # Discord event handlers
│   ├── taskThreads/                # Core task thread system
│   ├── tools/                      # Discord API tools
│   └── utils/                      # Utilities
├── memory-bank/                    # Documentation
└── package.json                    # Dependencies and scripts
```

## Technical Constraints

### Performance Limitations
- **PostgreSQL Concurrency**: Improved concurrent write operations
- **Memory Usage**: Each task thread consumes memory for context
- **Context Size**: AI processing limited by token windows
- **Rate Limiting**: Discord API rate limits handled by discord.js

### Resource Constraints
- **fly.io Limits**: Memory and CPU constraints in cloud deployment
- **Thread Lifecycle**: Automatic cleanup to prevent memory leaks
- **Concurrent Threads**: Configurable limits per server/channel

## Architecture Decisions

### Core Design Patterns
- **Event-Driven Architecture**: React to Discord events asynchronously
- **Task Thread Isolation**: One active thread per channel for controlled processing
- **Tool-Based Actions**: All Discord operations through standardized tools
- **AI-First Processing**: All bot interactions go through AI agent

### Database Architecture
- **Migration-Based Schema**: Version-controlled database changes
- **Type Safety**: Database schema matches TypeScript types
- **State Persistence**: All important state stored in database
- **Automatic Cleanup**: Inactive threads cleaned up periodically

### Development Preferences
- **TypeScript-First**: Comprehensive type coverage for reliability
- **Modular Design**: Independent components for easy testing
- **Error Resilience**: Robust error handling at every level
- **Configuration-Driven**: Environment-based configuration

## Integration Patterns

### AI Integration
- **OpenRouter Provider**: Flexible model selection with fallbacks
- **Function Calling**: OpenAI-compatible tool execution
- **Context Management**: Rich message history for AI processing
- **Conversation State**: Maintained throughout processing loops

### Discord Integration
- **Event Handling**: Comprehensive Discord event processing
- **Permission System**: Automatic permission validation
- **Rate Limiting**: Built-in rate limit handling
- **Error Recovery**: Graceful handling of API failures

## Security Considerations

- **Environment Variables**: Sensitive data stored in .env files
- **Permission Validation**: Bot permissions checked before tool execution
- **Input Sanitization**: All user input validated and sanitized
- **Audit Logging**: Complete trail of bot actions and decisions
