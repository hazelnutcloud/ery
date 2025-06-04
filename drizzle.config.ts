import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || './data/ery.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;
