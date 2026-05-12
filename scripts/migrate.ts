#!/usr/bin/env tsx
//
// Apply supabase/migrations/*.sql in lexical order via a direct Postgres
// connection. Idempotent: each migration uses `if not exists` / `add column
// if not exists` so re-running is safe.
//
// Required env:
//   SUPABASE_DB_URL  (Postgres connection string from Supabase dashboard:
//                    Settings → Database → Connection string → URI)
//
// Run:
//   npm run db:migrate

import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Missing SUPABASE_DB_URL.");
    console.error("Grab it from Supabase dashboard: Settings → Database → Connection string → URI.");
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    try {
      await client.query(sql);
      console.log(`  ok`);
    } catch (err) {
      console.error(`  failed: ${err instanceof Error ? err.message : String(err)}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(`Applied ${files.length} migration(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
