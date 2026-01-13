import { migrate } from "drizzle-orm/postgres-js/migrator";
import { client, db } from "./connection";

export async function runMigrations() {
  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "./migrations" });

  console.log("Migrations completed!");
  await client.end();
}
