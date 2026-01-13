import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const metadataRegistry = pgTable(
  "metadata_registry",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    type: text("type")
      .notNull()
      .$type<"number" | "date" | "boolean" | "keyword" | "text">(),
    constraintsJson: jsonb("constraints_json").$type<Record<string, unknown>>(),
    promoteTo: text("promote_to")
      .notNull()
      .$type<
        "meta_num" | "meta_date" | "meta_bool" | "meta_kw" | "meta_text"
      >(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Unique constraint: one key per tenant
    tenantKeyUnique: unique().on(table.tenantId, table.key),
    // Index on tenantId for efficient lookups
    tenantIdIdx: index("metadata_registry_tenant_id_idx").on(table.tenantId),
  })
);
