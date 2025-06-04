# Technical Context

## Technology Stack

### Runtime & Language
- **BunJS**: Fast JavaScript runtime for optimal performance
- **TypeScript**: Type-safe development with modern JavaScript features
- **Node.js compatibility**: Leveraging existing ecosystem

### Core Dependencies
- **discord.js**: Primary Discord API interaction library
- **discord-api-types**: TypeScript definitions for Discord API
- **drizzle-orm**: Type-safe SQL ORM for database operations

### Task Thread System Dependencies
- **Worker Threads**: For parallel task thread execution
- **Queue Management**: Message queuing for channel-specific thread limits
- **Context Processing**: Message history fetching and formatting
- **Tool Execution**: Discord API tool wrapper implementations

### Database
- **SQLite**: Lightweight, file-based database for persistent storage
- Suitable for bot data, user preferences, moderation logs, and learning data

### Deployment
- **Docker**: Containerized deployment for consistency
- **fly.io**: Cloud platform for hosting and scaling
- Supports global deployment for low-latency responses

## Development Setup

### Prerequisites
- Bun v1.2.15+ installed
- TypeScript 5+ for development
- Docker for containerization

### Commands
```bash
bun install          # Install dependencies
bun run src/index.ts     # Run development server
```

### Project Structure
```
ery/
├── src/
│   └── index.ts     # Main application entry point
├── memory-bank/     # Cline's memory and documentation
├── package.json     # Project configuration
├── tsconfig.json    # TypeScript configuration
└── README.md        # Basic project info
```

## Technical Constraints

- SQLite limitations for concurrent writes (consider if scaling needed)
- fly.io resource constraints
- Discord bot permissions and security requirements

### Task Thread Specific Constraints
- **Memory Management**: Each task thread consumes memory for context and state
- **Concurrency Limits**: Maximum parallel task threads per server/channel
- **Context Size Limits**: Message history size constraints for AI processing
- **Thread Lifecycle**: Proper cleanup to prevent memory leaks

## Architecture Decisions

- **Modular Design**: Separate concerns for moderation, community features, and learning
- **Event-Driven**: React to Discord events (messages, joins, etc.)
- **Persistent State**: Store configuration, logs, and learning data
- **Graceful Degradation**: Handle API failures and network issues

### Task Thread Architecture
- **One Thread Per Channel**: Ensure single active task thread per Discord channel
- **Context-First Design**: Always provide recent message history to task threads
- **Tool-Based Actions**: All Discord operations performed through standardized tools
- **Parallel Processing**: Support multiple simultaneous task threads across channels
- **State Isolation**: Each task thread maintains independent state and context

## Development Patterns

- TypeScript-first development for type safety
- Async/await for Discord API interactions
- Error handling and logging for debugging
- Configuration-driven behavior for different servers
