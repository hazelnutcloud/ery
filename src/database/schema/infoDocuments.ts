import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const infoDocuments = sqliteTable(
  "info_documents",
  {
    id: text("id").primaryKey(), // UUID
    guildId: text("guild_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdBy: text("created_by").notNull(), // Discord user ID
  },
  (table) => [
    index("idx_info_documents_guild").on(table.guildId),
    index("idx_info_documents_name_guild").on(table.name, table.guildId),
  ]
);
