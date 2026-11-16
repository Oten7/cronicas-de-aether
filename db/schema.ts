// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  title: text("title").notNull(),
  state: text("state").notNull(),
  version: integer("version").notNull().default(0),
  lockedUntil: integer("locked_until").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
  code: text("code").notNull().unique(),
});
export const members = sqliteTable(
  "members",
  {
    campaign: text("campaign")
      .notNull()
      .references(() => campaigns.id),
    user: text("user").notNull(),
  },
  (t) => [primaryKey({ columns: [t.campaign, t.user] })],
);
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  campaign: text("campaign")
    .notNull()
    .references(() => campaigns.id),
  kind: text("kind").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
});
