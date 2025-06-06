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
    maxActiveThreadsPerGuild: 50, // Maximum concurrent threads per server
    threadTimeoutMs: 300000, // 5 minutes timeout for inactive threads
    cleanupIntervalMs: 60000, // 1 minute interval for cleanup
    
    // Message Batching Configuration
    batchMessageCount: 5, // Number of messages to trigger a batch
    batchTimeWindowMs: 30000, // 30 seconds - time window to trigger a batch
    maxQueueAge: 300000, // 5 minutes - max age before queues are cleaned up
    queueCleanupIntervalMs: 60000, // 1 minute interval for queue cleanup
  },
  
  // AI Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.AI_MODEL || 'anthropic/claude-3.5-sonnet',
    fallbackModel: process.env.AI_FALLBACK_MODEL || 'openai/gpt-4o-mini',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
    // OpenRouter specific settings
    siteName: process.env.OPENROUTER_SITE_NAME || 'Ery Discord Bot',
    siteUrl: process.env.OPENROUTER_SITE_URL,
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
  
  if (config.ai.provider === 'openrouter' && !config.ai.apiKey) {
    console.warn('OPENROUTER_API_KEY not provided - AI features will be limited');
  }
  
  if (config.ai.provider !== 'none' && !config.ai.apiKey) {
    console.warn('AI API key not provided - AI features will be limited');
  }
}
