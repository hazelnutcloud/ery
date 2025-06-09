import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const infoDocuments = pgTable(
  "info_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(), // UUID
    guildId: text("guild_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull(), // Discord user ID
  },
  (table) => [
    index("idx_info_documents_guild").on(table.guildId),
    index("idx_info_documents_name_guild").on(table.name, table.guildId),
  ]
);
