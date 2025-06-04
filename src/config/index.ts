export const config = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_BOT_TOKEN!,
    intents: [
      'Guilds',
      'GuildMembers',
      'GuildMessages',
      'GuildMessageReactions',
      'MessageContent',
      'DirectMessages',
      'GuildVoiceStates',
      'GuildModeration',
    ],
  },
  
  // Database Configuration
  database: {
    path: process.env.DATABASE_PATH || './data/ery.db',
  },
  
  // Task Thread Configuration
  taskThread: {
    contextMessageLimit: 20, // Number of messages to include in context
    contextTimeframeMinutes: 30, // Time window for context messages
    maxActiveThreadsPerGuild: 10, // Maximum concurrent threads per server
    threadTimeoutMs: 300000, // 5 minutes timeout for inactive threads
    cleanupIntervalMs: 60000, // 1 minute interval for cleanup
  },
  
  // AI Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    colors: true,
  },
  
  // Bot Configuration
  bot: {
    prefix: '!', // Command prefix (for legacy commands)
    defaultCooldownMs: 3000, // Default command cooldown
    adminRoles: ['Admin', 'Moderator'], // Default admin role names
  },
};

// Validate required configuration
export function validateConfig() {
  if (!config.discord.token) {
    throw new Error('DISCORD_BOT_TOKEN is required in environment variables');
  }
  
  if (config.ai.provider !== 'none' && !config.ai.apiKey) {
    console.warn('AI_API_KEY not provided - AI features will be limited');
  }
}
