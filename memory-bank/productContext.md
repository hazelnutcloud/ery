# Product Context

## Problem Statement

Discord servers need effective moderation to maintain healthy communities, but human moderators face challenges:
- Time zone coverage gaps
- Inconsistent rule enforcement
- Burnout from repetitive tasks
- Difficulty scaling moderation with server growth
- Need for 24/7 availability

## Solution

Ery is an AI-powered Discord moderation bot that operates through a **task thread system**:

### Core Mechanics
- **Task Thread Creation**: Every message in a Discord channel triggers a new task thread if none is currently active
- **Context-Aware Processing**: Each task thread receives recent message history as context for intelligent decision-making
- **Tool-Based Actions**: Task threads execute specific tools (ban_member, send_message, fetch_messages, etc.) to perform Discord operations
- **Parallel Channel Processing**: Multiple channels can have active task threads simultaneously
- **Channel Isolation**: Each channel maintains only one active task thread at a time

### Key Features
- **Intelligent Moderation**: Context-aware automated moderation using recent message history
- **Real-time Response**: Immediate task thread creation for every channel message
- **Comprehensive Tools**: Full suite of Discord API tools for moderation, communication, and server management
- **Adaptive Behavior**: Continuous learning from interactions and server-specific patterns
- **Scalable Architecture**: Parallel processing across multiple channels and servers

## Target Users

- **Discord Server Owners**: Need reliable, scalable moderation
- **Server Moderators**: Want assistance with routine tasks
- **Community Members**: Benefit from consistent, fair moderation and engaging activities

## User Experience Goals

- **Seamless Integration**: Bot should feel like a natural part of the server
- **Intelligent Responses**: Context-aware interactions that understand server culture
- **Transparent Actions**: Clear communication about moderation decisions
- **Customizable Behavior**: Adaptable to different server needs and rules
- **Learning Capability**: Improves over time based on feedback and interactions

## Success Metrics

- Reduction in manual moderation workload
- Improved response time to rule violations
- Increased community engagement through activities
- Positive feedback from server members and moderators
- Successful adaptation to server-specific rules and culture
