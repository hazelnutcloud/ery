import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// Get database path from environment or use default
const dbPath = process.env.DATABASE_PATH || './data/ery.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create SQLite database instance
export const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.run('PRAGMA foreign_keys = ON');

// Enable WAL mode for better concurrency
sqlite.run('PRAGMA journal_mode = WAL');

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Database initialization function
export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Run migrations to create/update tables
    console.log('Running database migrations...');
    migrate(db, { migrationsFolder: './src/database/migrations' });
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Graceful shutdown
export function closeDatabase() {
  sqlite.close();
  console.log('Database connection closed');
}
