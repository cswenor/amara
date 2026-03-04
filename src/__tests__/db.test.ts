import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase, runMigrations } from "../db.js";

describe("openDatabase", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "amara-db-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates database directory if it does not exist", () => {
    const dbPath = join(tempDir, "nested", "deep", "tasks.db");
    const db = openDatabase(dbPath);
    db.close();
    // If we got here without throwing, the directory was created
    assert.ok(true);
  });

  it("enables WAL journal mode", () => {
    const dbPath = join(tempDir, "tasks.db");
    const db = openDatabase(dbPath);
    const row = db.prepare("PRAGMA journal_mode").get() as {
      journal_mode: string;
    };
    assert.equal(row.journal_mode, "wal");
    db.close();
  });

  it("sets synchronous=FULL", () => {
    const dbPath = join(tempDir, "tasks.db");
    const db = openDatabase(dbPath);
    const row = db.prepare("PRAGMA synchronous").get() as {
      synchronous: number;
    };
    // synchronous=FULL is value 2
    assert.equal(row.synchronous, 2);
    db.close();
  });

  it("configures busy_timeout", () => {
    const dbPath = join(tempDir, "tasks.db");
    const db = openDatabase(dbPath);
    const row = db.prepare("PRAGMA busy_timeout").get() as {
      timeout: number;
    };
    assert.equal(row.timeout, 5000);
    db.close();
  });

  it("throws on invalid path", () => {
    assert.throws(() => {
      openDatabase("/dev/null/impossible/tasks.db");
    });
  });
});

describe("runMigrations", () => {
  let tempDir: string;
  let migrationsDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "amara-migrate-test-"));
    migrationsDir = join(tempDir, "migrations");
    mkdirSync(migrationsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createDb(): DatabaseSync {
    return new DatabaseSync(":memory:");
  }

  function writeMigration(name: string, sql: string): void {
    writeFileSync(join(migrationsDir, name), sql, "utf-8");
  }

  it("creates schema_version table on first run", () => {
    const db = createDb();
    runMigrations(db, migrationsDir);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
      )
      .all() as { name: string }[];
    assert.equal(tables.length, 1);
    db.close();
  });

  it("applies migrations in numeric order", () => {
    writeMigration(
      "002_second.sql",
      "CREATE TABLE second (id INTEGER PRIMARY KEY);",
    );
    writeMigration(
      "001_first.sql",
      "CREATE TABLE first (id INTEGER PRIMARY KEY);",
    );

    const db = createDb();
    runMigrations(db, migrationsDir);

    const versions = (
      db.prepare("SELECT version, name FROM schema_version ORDER BY version").all() as {
        version: number;
        name: string;
      }[]
    );
    assert.equal(versions.length, 2);
    assert.equal(versions[0].version, 1);
    assert.equal(versions[0].name, "001_first.sql");
    assert.equal(versions[1].version, 2);
    assert.equal(versions[1].name, "002_second.sql");

    // Verify both tables exist
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
        name: string;
      }[]
    ).map((t) => t.name);
    assert.ok(tables.includes("first"));
    assert.ok(tables.includes("second"));
    db.close();
  });

  it("skips already-applied migrations (idempotent)", () => {
    writeMigration(
      "001_create.sql",
      "CREATE TABLE items (id INTEGER PRIMARY KEY);",
    );

    const db = createDb();
    runMigrations(db, migrationsDir);
    runMigrations(db, migrationsDir);

    const versions = db
      .prepare("SELECT version FROM schema_version")
      .all() as { version: number }[];
    assert.equal(versions.length, 1, "migration must not be duplicated");
    db.close();
  });

  it("rolls back failed migration (no partial state)", () => {
    writeMigration(
      "001_good.sql",
      "CREATE TABLE good (id INTEGER PRIMARY KEY);",
    );
    writeMigration("002_bad.sql", "INVALID SQL STATEMENT;");

    const db = createDb();
    assert.throws(() => {
      runMigrations(db, migrationsDir);
    });

    // Good migration applied, bad one rolled back
    const versions = db
      .prepare("SELECT version FROM schema_version")
      .all() as { version: number }[];
    assert.equal(versions.length, 1);
    assert.equal(versions[0].version, 1);

    // Bad table should not exist
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[]
    ).map((t) => t.name);
    assert.ok(!tables.includes("bad"), "failed migration must not leave artifacts");
    db.close();
  });

  it("works with the real 001_initial_schema.sql migration", () => {
    const realMigrationsDir = join(
      import.meta.dirname,
      "../../migrations",
    );
    const db = createDb();
    runMigrations(db, realMigrationsDir);

    // schema_version should have version 1
    const versions = db
      .prepare("SELECT version, name FROM schema_version")
      .all() as { version: number; name: string }[];
    assert.equal(versions.length, 1);
    assert.equal(versions[0].version, 1);
    assert.equal(versions[0].name, "001_initial_schema.sql");

    // tasks table should exist
    const columns = db.prepare("PRAGMA table_info(tasks)").all();
    assert.ok(columns.length > 0, "tasks table must exist after migration");
    db.close();
  });

  it("records applied_at timestamp in ISO-8601 format", () => {
    writeMigration(
      "001_ts.sql",
      "CREATE TABLE ts_test (id INTEGER PRIMARY KEY);",
    );

    const db = createDb();
    runMigrations(db, migrationsDir);

    const row = db
      .prepare("SELECT applied_at FROM schema_version WHERE version = 1")
      .get() as { applied_at: string };
    assert.ok(row.applied_at, "applied_at must be set");

    const iso8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    assert.match(row.applied_at, iso8601, "applied_at must be ISO-8601");
    db.close();
  });

  it("handles empty migrations directory", () => {
    const db = createDb();
    runMigrations(db, migrationsDir);

    const versions = db
      .prepare("SELECT version FROM schema_version")
      .all() as { version: number }[];
    assert.equal(versions.length, 0, "no migrations applied");
    db.close();
  });
});
