# Ery - AI-Powered Discord Moderation Bot

Ery is an intelligent Discord bot designed to act as a server moderator using a unique task thread system. It processes messages with context awareness and executes moderation actions through a comprehensive tool system.

## Features

- **Task Thread System**: One active thread per channel with parallel processing across channels
- **Context-Aware Processing**: Analyzes recent message history for intelligent decision-making
- **Comprehensive Tool Suite**: Full Discord API integration for moderation and interaction
- **Persistent Storage**: SQLite database for configuration and audit logs
- **Modular Architecture**: Separate modules for moderation, community, and interaction features

## Tech Stack

- **Runtime**: Bun (fast JavaScript runtime)
- **Language**: TypeScript
- **Discord Library**: discord.js v14
- **Database**: SQLite with Drizzle ORM
- **Deployment**: Docker + fly.io (planned)

## Quick Start

### Prerequisites

- Bun v1.2.15+ installed
- Discord bot token (create at https://discord.com/developers/applications)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ery
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment:
```bash
cp .env.example .env
# Edit .env and add your DISCORD_BOT_TOKEN
```

4. Run the bot:
```bash
chmod +x test-bot.sh
./test-bot.sh
```

Or directly with:
```bash
bun run src/index.ts
```

## Project Structure

```
ery/
├── src/
│   ├── bot/           # Discord client setup
│   ├── config/        # Configuration management
│   ├── database/      # Database schema and connection
│   ├── events/        # Discord event handlers
│   ├── taskThreads/   # Task thread system
│   ├── utils/         # Utility functions
│   └── index.ts       # Main entry point
├── memory-bank/       # Project documentation
├── data/              # SQLite database (auto-created)
└── test-bot.sh        # Test script
```

## Current Status

The bot currently:
- ✅ Connects to Discord
- ✅ Creates task threads for each message
- ✅ Fetches message context (last 20 messages within 30 minutes)
- ✅ Manages thread lifecycle with automatic cleanup
- ❌ Processes threads with AI (not yet implemented)
- ❌ Executes moderation tools (not yet implemented)

## Development

### Database Schema

The bot uses SQLite with the following main tables:
- `task_threads`: Active thread management
- `tool_executions`: Audit log of all tool usage
- `servers`: Server-specific configuration
- `users`: User data and preferences
- `moderation_logs`: Moderation action history

### Task Thread Flow

1. Message received in Discord channel
2. Check if channel has active thread
3. Create new thread or use existing
4. Fetch recent message context
5. Process with AI agent (TODO)
6. Execute appropriate tools (TODO)
7. Complete thread with results

### Configuration

Key configuration options in `src/config/index.ts`:
- `contextMessageLimit`: Number of messages to include (default: 20)
- `contextTimeframeMinutes`: Time window for messages (default: 30)
- `threadTimeoutMs`: Thread inactivity timeout (default: 5 minutes)
- `maxActiveThreadsPerGuild`: Concurrent thread limit (default: 10)

## Contributing

This project uses a memory bank system for documentation. Key files:
- `memory-bank/projectbrief.md`: Project overview
- `memory-bank/systemPatterns.md`: Architecture patterns
- `memory-bank/progress.md`: Current progress
- `memory-bank/activeContext.md`: Active development context

## License

[License information to be added]

## Support

[Support information to be added]
