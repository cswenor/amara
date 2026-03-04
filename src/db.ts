import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const DEFAULT_DB_PATH = join(homedir(), ".amara", "tasks.db");
const DEFAULT_MIGRATIONS_DIR = join(import.meta.dirname, "../migrations");

export function openDatabase(dbPath: string = DEFAULT_DB_PATH): DatabaseSync {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA synchronous=FULL");
  db.exec("PRAGMA busy_timeout=5000");
  return db;
}

export function runMigrations(
  db: DatabaseSync,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);

  const applied = new Set(
    (
      db.prepare("SELECT version FROM schema_version").all() as {
        version: number;
      }[]
    ).map((r) => r.version),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => ({ file: f, version: parseInt(f.match(/^(\d+)/)![1], 10) }))
    .sort((a, b) => a.version - b.version);

  for (const { file, version } of files) {
    if (applied.has(version)) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare(
        "INSERT INTO schema_version (version, name) VALUES (?, ?)",
      ).run(version, file);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}
