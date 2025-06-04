import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db, sqlite } from "./connection";
import { logger } from "../utils/logger";

async function runMigrations() {
  try {
    logger.info("Starting database migrations...");

    // Enable foreign keys
    sqlite.run("PRAGMA foreign_keys = ON");

    // Run migrations
    migrate(db, { migrationsFolder: "./src/database/migrations" });

    logger.info("Migrations completed successfully!");

    // Close database connection
    sqlite.close();
    process.exit(0);
  } catch (error) {
    logger.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
