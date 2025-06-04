#!/bin/bash

echo "Ery Discord Bot Test Script"
echo "=========================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo ""
    echo "Please create a .env file with your Discord bot token:"
    echo "cp .env.example .env"
    echo "Then edit .env and add your DISCORD_BOT_TOKEN"
    exit 1
fi

# Check if bot token is set
if ! grep -q "DISCORD_BOT_TOKEN=.+" .env; then
    echo "❌ Error: DISCORD_BOT_TOKEN not set in .env!"
    echo "Please add your Discord bot token to the .env file"
    exit 1
fi

echo "✅ Environment file found"
echo ""
echo "Starting Ery bot..."
echo "Press Ctrl+C to stop"
echo ""

# Run the bot
bun run src/index.ts
