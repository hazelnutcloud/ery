# Ery - AI-Powered Discord Moderation Bot

Ery is an intelligent Discord bot that uses AI to moderate Discord servers through a unique task thread system. It processes messages with full context awareness and executes actions through a comprehensive Discord API tool system.

## Features

- **AI-Powered Processing**: Uses OpenRouter for intelligent decision-making and response generation
- **Task Thread System**: One active thread per channel with parallel processing across multiple channels
- **Context-Aware Analysis**: Analyzes recent message history with full user and bot conversation context
- **Tool-Based Actions**: Comprehensive Discord API tools for moderation, communication, and server management
- **Loop-Based Processing**: AI processes context until all necessary tools are executed
- **Persistent Storage**: SQLite database with automated migrations for state and audit logs

## Tech Stack

- **Runtime**: Bun (fast JavaScript runtime with built-in SQLite)
- **Language**: TypeScript
- **Discord Library**: discord.js v14 with discord-api-types
- **AI Integration**: OpenRouter API with OpenAI-compatible function calling
- **Database**: SQLite with Drizzle ORM and automated migrations
- **Deployment**: Docker + fly.io (planned)

## Quick Start

### Prerequisites

- Bun v1.0+ installed
- Discord bot token (create at https://discord.com/developers/applications)
- OpenRouter API key (get at https://openrouter.ai)

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
# Edit .env and add your DISCORD_BOT_TOKEN and OPENROUTER_API_KEY
```

4. Run the bot:
```bash
bun run src/index.ts
```

## Project Structure

```
ery/
├── src/
│   ├── ai/              # AI integration (OpenRouter, Agent)
│   ├── bot/             # Discord client setup
│   ├── config/          # Configuration management
│   ├── database/        # Database schema, migrations, connection
│   ├── events/          # Discord event handlers
│   ├── taskThreads/     # Task thread system and message processing
│   ├── tools/           # Discord API tools (communication, moderation, information)
│   ├── utils/           # Utility functions and logger
│   └── index.ts         # Main entry point
├── memory-bank/         # Project documentation and context
└── test-bot.sh          # Development test script
```

## Current Status

**Fully Functional AI-Powered Discord Bot** - 75% Complete

### What Works ✅
- **Complete Discord Integration**: Bot connects and processes all messages
- **AI Processing**: Full OpenRouter integration with loop-based tool execution
- **Task Thread System**: Message batching, context management, and lifecycle handling
- **Tool Execution**: SendMessage, BanMember, and FetchMessages tools implemented
- **Database System**: SQLite with automated migrations and type safety
- **Event Handling**: Comprehensive Discord event processing with graceful shutdown

### Available Tools
- **SendMessageTool**: Send messages with reply targeting by message ID
- **BanMemberTool**: Ban users with reason and duration options  
- **FetchMessagesTool**: Retrieve message history with filtering options

### What's Next ❌
- **Extended Tool Library**: Kick, mute, role management, message deletion tools
- **Server Configuration**: Per-server rules and customization system
- **Advanced Features**: Community activities, analytics, and learning systems
- **Production Deployment**: Docker containerization and cloud deployment

## How It Works

### Task Thread Flow
1. **Message Reception**: Discord message triggers task thread creation
2. **Context Building**: Recent message history (including bot messages) collected with metadata
3. **AI Processing**: OpenRouter AI analyzes context and determines appropriate actions
4. **Tool Execution**: AI executes Discord tools in a processing loop until completion
5. **Response Generation**: AI communicates through send_message tool only
6. **State Persistence**: All thread state and results saved to database

### Message Processing
- **Intelligent Batching**: Messages batched by count (5), time (30s), or bot mentions
- **Channel Isolation**: One active task thread per channel prevents conflicts
- **Context Rich**: AI receives full conversation history with message IDs for precise targeting
- **Parallel Processing**: Multiple channels can have active threads simultaneously

## Configuration

Key environment variables:
```bash
DISCORD_BOT_TOKEN=your_discord_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
LOG_LEVEL=info
NODE_ENV=development
```

## Development

### Database Operations
```bash
bun run db:generate    # Generate new migrations
bun run db:migrate     # Apply pending migrations
```

### Adding New Tools
1. Create tool class in `src/tools/discord/[category]/`
2. Extend the base `Tool` class
3. Implement required methods with proper validation
4. Export from appropriate index file for auto-discovery

## Contributing

This project uses a comprehensive memory bank system for documentation:
- `memory-bank/projectbrief.md`: Project overview and goals
- `memory-bank/productContext.md`: Product vision and user experience
- `memory-bank/systemPatterns.md`: Architecture patterns and design decisions
- `memory-bank/techContext.md`: Technical stack and development setup
- `memory-bank/activeContext.md`: Current development focus and next steps
- `memory-bank/progress.md`: Project status and completed features

## License

[License information to be added]

## Support

[Support information to be added]
