import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const pastes = sqliteTable(
  "pastes",
  {
    id: text("id").primaryKey(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    expiresAt: integer("expires_at", { mode: "number" }),
    sizeBytes: integer("size_bytes").notNull(),
  },
  (table) => [index("idx_expires_at").on(table.expiresAt)],
);

export type Paste = typeof pastes.$inferSelect;
export type NewPaste = typeof pastes.$inferInsert;
