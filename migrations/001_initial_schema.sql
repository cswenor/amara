-- Amara Task Schema v1
-- Epic 1, Story S1.1 — Core task table for the Amara task state machine
--
-- Database location: ~/.amara/tasks.db
-- States: pending, in_progress, blocked, complete, failed
-- ID format: ULID or UUID stored as TEXT
-- Timestamps: UTC ISO-8601 text (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
--
-- See: docs/architecture.md, docs/epics/01-core-infrastructure.md

CREATE TABLE tasks (
  task_id        TEXT PRIMARY KEY NOT NULL,
  state          TEXT NOT NULL DEFAULT 'pending'
                   CHECK (state IN ('pending', 'in_progress', 'blocked', 'complete', 'failed')),
  channel        TEXT NOT NULL,
  blocked_reason TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  correlation_id TEXT NOT NULL
);

CREATE INDEX idx_tasks_state_updated_at ON tasks (state, updated_at DESC);

CREATE INDEX idx_tasks_correlation_id ON tasks (correlation_id);
