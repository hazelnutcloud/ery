# Ery Project Brief

## Overview

Ery is an AI agent designed to act as a discord server moderator. The agent is capable of performing various moderation tasks such as banning users, deleting messages, running community activites, responding to user queries, and more. It is built to be efficient, adaptable, and capable of learning from its interactions.

## Features

- **Moderation Tasks**: Ban users, delete messages, and manage server settings.
- **Community Activities**: Run events, polls, and other community engagement activities.
- **User Interaction**: Respond to user queries and provide assistance.
- **Learning and Adaptation**: Continuously improve its performance based on user interactions and feedback.

## Technical Specifications

- **Runtime**: BunJS
- **Language**: TypeScript
- **Deployment**: Docker image deployed on fly.io
- **Database**: SQLite for persistent storage using Bun's builtin SQLite library
- **Libraries**: 
  - `discord.js` for Discord API interactions
  - `discord-api-types` for Discord API type definitions
  - `drizzle-orm` for database interactions

## Development Guidelines

- **Dependency Management**: Use `bun install <package>` to install dependencies one-by-one instead of editing package.json directly
- **SQLite Usage**: Use Bun's builtin SQLite library instead of installing external SQLite packages
- **Package Management**: Let Bun handle package.json updates automatically during installation
