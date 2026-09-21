import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "better-sqlite3";
import { loadEnv } from "../config/Env.js";
import { openDatabase, type Db } from "../shared/Db.js";

const defaultDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

export function runMigrations(db: Database, dir: string = defaultDir): string[] {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT)");
  const applied = new Set(
    (db.prepare("SELECT version FROM schema_migrations").all() as { version: string }[]).map((r) => r.version),
  );
  const files = readdirSync(dir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();
  const insert = db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)");
  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(dir, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      insert.run(file, new Date().toISOString());
    })();
    newlyApplied.push(file);
  }
  return newlyApplied;
}

export function openMigratedDatabase(databasePath: string): Db {
  const db = openDatabase(databasePath);
  runMigrations(db);
  return db;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = openMigratedDatabase(loadEnv().DATABASE_PATH);
  console.log("Migrations aplicadas:", db.prepare("SELECT version FROM schema_migrations ORDER BY version").all());
  db.close();
}
