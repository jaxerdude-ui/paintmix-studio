import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("paintmix_records", {
  ownerId: text("owner_id").notNull(),
  kind: text("kind").notNull(),
  id: text("id").notNull(),
  payload: text("payload").notNull(),
}, table => [primaryKey({columns:[table.ownerId,table.kind,table.id]})]);
