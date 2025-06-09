import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/neon-http/migrator';

// Create Neon database instance
const sql = neon(process.env.DATABASE_URL!);

// Create drizzle instance
export const db = drizzle(sql, { schema });

// Database initialization function
export async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Run migrations to create/update tables
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder: './src/database/migrations' });
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Graceful shutdown (no-op for serverless)
export function closeDatabase() {
  console.log('Database connection closed (serverless)');
}
