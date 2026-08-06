CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  student_name  VARCHAR(100) NOT NULL,
  service_id    VARCHAR(50),
  service_name  VARCHAR(150) NOT NULL,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('joined', 'near_turn', 'served', 'left', 'custom')),
  message       VARCHAR(300) NOT NULL,
  status        VARCHAR(10) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Widen the type CHECK to include 'left' on a DB that already has the table
-- from before this notification type existed (CREATE TABLE IF NOT EXISTS
-- above is a no-op in that case, so the old constraint would otherwise stick).
DO $$
BEGIN
  ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('joined', 'near_turn', 'served', 'left', 'custom'));
EXCEPTION
  WHEN undefined_object THEN NULL; -- fresh table already has the right constraint name/def
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_student_name ON notifications (LOWER(student_name));
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS queue_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID,
  student_name    VARCHAR(100) NOT NULL,
  service_id      VARCHAR(50),
  service_name    VARCHAR(150) NOT NULL,
  priority        VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status          VARCHAR(10) NOT NULL CHECK (status IN ('served', 'left', 'canceled')),
  joined_at       TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  waited_minutes  INTEGER NOT NULL CHECK (waited_minutes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_queue_history_student_name ON queue_history (LOWER(student_name));
CREATE INDEX IF NOT EXISTS idx_queue_history_ended_at ON queue_history (ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_history_service_id ON queue_history (service_id);

DO $$
BEGIN
  ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN undefined_table THEN RAISE NOTICE 'Skipping fk_notifications_user: users table not found yet';
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE notifications ADD CONSTRAINT fk_notifications_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
EXCEPTION
  WHEN undefined_table THEN RAISE NOTICE 'Skipping fk_notifications_service: services table not found yet';
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE queue_history ADD CONSTRAINT fk_queue_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN undefined_table THEN RAISE NOTICE 'Skipping fk_queue_history_user: users table not found yet';
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE queue_history ADD CONSTRAINT fk_queue_history_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
EXCEPTION
  WHEN undefined_table THEN RAISE NOTICE 'Skipping fk_queue_history_service: services table not found yet';
  WHEN duplicate_object THEN NULL;
END $$;

-- Unique constraints (assignment requirement: required fields, length limits,
-- correct data types, AND unique constraints must be enforced at DB level).
-- Both tables are append-only logs, so uniqueness is scoped to a business
-- rule rather than the whole row:

-- A single queue visit (one student, one service, one joined_at timestamp)
-- must resolve to exactly one history row. Guards against a route bug or
-- retried request double-recording the same resolution.
DO $$
BEGIN
  ALTER TABLE queue_history ADD CONSTRAINT uq_queue_history_visit UNIQUE (student_name, service_id, joined_at);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- A student shouldn't accumulate more than one *unread* "you're almost up"
-- ping for the same service at once. Scoped to type/status so it doesn't
-- block legitimate near-turn notifications on a later, separate visit.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_near_turn_pending
  ON notifications (student_name, service_id)
  WHERE type = 'near_turn' AND status = 'sent';
