import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "./connection";
import { logger } from "../utils/logger";

async function runMigrations() {
  try {
    logger.info("Starting database migrations...");

    // Run migrations
    await migrate(db, { migrationsFolder: "./src/database/migrations" });

    logger.info("Migrations completed successfully!");

    process.exit(0);
  } catch (error) {
    logger.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
