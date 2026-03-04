import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const MIGRATION_PATH = resolve(
  import.meta.dirname,
  "../../../migrations/001_initial_schema.sql",
);

function loadMigration(): string {
  return readFileSync(MIGRATION_PATH, "utf-8");
}

function applyMigration(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(loadMigration());
  return db;
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface IndexListEntry {
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
}

interface IndexColumnEntry {
  seqno: number;
  cid: number;
  name: string;
}

describe("001_initial_schema migration", () => {
  it("creates the tasks table", () => {
    const db = applyMigration();
    const columns = db
      .prepare("PRAGMA table_info(tasks)")
      .all() as ColumnInfo[];
    assert.ok(columns.length > 0, "tasks table must exist");
    db.close();
  });

  it("has all required columns with correct types", () => {
    const db = applyMigration();
    const columns = db
      .prepare("PRAGMA table_info(tasks)")
      .all() as ColumnInfo[];

    const expected: Record<string, { type: string; notnull: boolean }> = {
      task_id: { type: "TEXT", notnull: true },
      state: { type: "TEXT", notnull: true },
      channel: { type: "TEXT", notnull: true },
      blocked_reason: { type: "TEXT", notnull: false },
      created_at: { type: "TEXT", notnull: true },
      updated_at: { type: "TEXT", notnull: true },
      correlation_id: { type: "TEXT", notnull: true },
    };

    assert.equal(columns.length, 7, "tasks table must have exactly 7 columns");

    for (const [name, spec] of Object.entries(expected)) {
      const col = columns.find((c) => c.name === name);
      assert.ok(col, `column '${name}' must exist`);
      assert.equal(col.type, spec.type, `${name} type must be ${spec.type}`);
      assert.equal(
        col.notnull,
        spec.notnull ? 1 : 0,
        `${name} notnull must be ${spec.notnull}`,
      );
    }

    db.close();
  });

  it("task_id is the primary key", () => {
    const db = applyMigration();
    const columns = db
      .prepare("PRAGMA table_info(tasks)")
      .all() as ColumnInfo[];
    const taskId = columns.find((c) => c.name === "task_id");
    assert.ok(taskId, "task_id column must exist");
    assert.equal(taskId.pk, 1, "task_id must be the primary key");
    db.close();
  });

  it("state CHECK constraint rejects invalid values", () => {
    const db = applyMigration();
    assert.throws(
      () => {
        db.prepare(
          "INSERT INTO tasks (task_id, state, channel, correlation_id) VALUES (?, ?, ?, ?)",
        ).run("id-1", "invalid_state", "whatsapp", "corr-1");
      },
      /CHECK/i,
      "inserting invalid state must throw a CHECK constraint error",
    );
    db.close();
  });

  it("accepts all valid states", () => {
    const db = applyMigration();
    const validStates = [
      "pending",
      "in_progress",
      "blocked",
      "complete",
      "failed",
    ];

    for (const state of validStates) {
      db.prepare(
        "INSERT INTO tasks (task_id, state, channel, correlation_id) VALUES (?, ?, ?, ?)",
      ).run(`id-${state}`, state, "whatsapp", `corr-${state}`);
    }

    const count = db.prepare("SELECT COUNT(*) AS cnt FROM tasks").get() as {
      cnt: number;
    };
    assert.equal(count.cnt, validStates.length, "all valid states accepted");
    db.close();
  });

  it("defaults state to 'pending' and populates timestamps", () => {
    const db = applyMigration();
    db.prepare(
      "INSERT INTO tasks (task_id, channel, correlation_id) VALUES (?, ?, ?)",
    ).run("id-default", "gmail", "corr-default");

    const row = db
      .prepare("SELECT state, created_at, updated_at FROM tasks WHERE task_id = ?")
      .get("id-default") as {
      state: string;
      created_at: string;
      updated_at: string;
    };

    assert.equal(row.state, "pending", "default state must be 'pending'");
    assert.ok(row.created_at, "created_at must be non-null");
    assert.ok(row.updated_at, "updated_at must be non-null");

    // Verify ISO-8601 format: YYYY-MM-DDTHH:MM:SS.sssZ
    const iso8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    assert.match(row.created_at, iso8601, "created_at must be ISO-8601");
    assert.match(row.updated_at, iso8601, "updated_at must be ISO-8601");

    db.close();
  });

  it("creates idx_tasks_state_updated_at index on (state, updated_at)", () => {
    const db = applyMigration();
    const indexes = db
      .prepare("PRAGMA index_list('tasks')")
      .all() as IndexListEntry[];

    const idx = indexes.find((i) => i.name === "idx_tasks_state_updated_at");
    assert.ok(idx, "idx_tasks_state_updated_at index must exist");

    const cols = db
      .prepare("PRAGMA index_info('idx_tasks_state_updated_at')")
      .all() as IndexColumnEntry[];

    const colNames = cols.map((c) => c.name);
    assert.deepEqual(
      colNames,
      ["state", "updated_at"],
      "index must cover (state, updated_at)",
    );

    db.close();
  });

  it("creates idx_tasks_correlation_id index on (correlation_id)", () => {
    const db = applyMigration();
    const indexes = db
      .prepare("PRAGMA index_list('tasks')")
      .all() as IndexListEntry[];

    const idx = indexes.find((i) => i.name === "idx_tasks_correlation_id");
    assert.ok(idx, "idx_tasks_correlation_id index must exist");

    const cols = db
      .prepare("PRAGMA index_info('idx_tasks_correlation_id')")
      .all() as IndexColumnEntry[];

    assert.equal(cols.length, 1);
    assert.equal(cols[0].name, "correlation_id");

    db.close();
  });

  it("migration file starts with a contiguous comment block", () => {
    const sql = loadMigration();
    const lines = sql.split("\n");

    // Find contiguous comment block at top
    let commentLines = 0;
    for (const line of lines) {
      if (line.startsWith("--")) {
        commentLines++;
      } else if (line.trim() === "") {
        // Allow blank lines within the comment header
        continue;
      } else {
        break;
      }
    }

    assert.ok(
      commentLines >= 5,
      `comment block must have at least 5 lines, found ${commentLines}`,
    );

    // Verify key metadata is present in the comment block
    const header = lines
      .slice(0, lines.findIndex((l) => l.startsWith("CREATE")))
      .join("\n");

    assert.match(header, /states:/i, "header must mention states");
    assert.match(header, /ULID|UUID/i, "header must mention ID format");
    assert.match(
      header,
      /ISO-8601|strftime/i,
      "header must mention timestamp convention",
    );
  });
});
