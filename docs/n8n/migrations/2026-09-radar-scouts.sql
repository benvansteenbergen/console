-- Radar: multiple scouts (topics) per user
-- Run as the table owner (`railway`); the n8n DB user has no DDL rights.
-- Safe to re-run (IF NOT EXISTS / scout_id IS NULL guards).
-- Rollback: see bottom of file.

BEGIN;

-- 1. Scouts ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS radar_scouts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  client_id           varchar,
  name                varchar NOT NULL DEFAULT 'My Radar',
  priorities_markdown text    NOT NULL DEFAULT '',
  status              varchar NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'archived')),
  created_at          timestamp DEFAULT now(),
  updated_at          timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS radar_scouts_user_idx ON radar_scouts (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON radar_scouts TO n8n;

-- 2. Link sources + concepts to a scout ---------------------------------------
ALTER TABLE radar_sources  ADD COLUMN IF NOT EXISTS scout_id uuid REFERENCES radar_scouts (id);
ALTER TABLE radar_concepts ADD COLUMN IF NOT EXISTS scout_id uuid REFERENCES radar_scouts (id);
CREATE INDEX IF NOT EXISTS radar_sources_scout_idx ON radar_sources (scout_id);

-- 3. Backfill: one "My Radar" scout per existing Radar user --------------------
INSERT INTO radar_scouts (user_id, client_id, name, priorities_markdown)
SELECT pu.n8n_user_id,
       pu.client_key,
       'My Radar',
       COALESCE(pu.settings -> 'radar' ->> 'priorities_markdown', '')
FROM portal_user pu
WHERE (   COALESCE(pu.settings -> 'radar' ->> 'priorities_markdown', '') <> ''
       OR EXISTS (SELECT 1 FROM radar_sources  s WHERE s.user_id = pu.n8n_user_id)
       OR EXISTS (SELECT 1 FROM radar_concepts c WHERE c.user_id = pu.n8n_user_id))
  AND NOT EXISTS (SELECT 1 FROM radar_scouts sc WHERE sc.user_id = pu.n8n_user_id);

UPDATE radar_sources s
SET scout_id = sc.id
FROM radar_scouts sc
WHERE sc.user_id = s.user_id AND s.scout_id IS NULL;

UPDATE radar_concepts c
SET scout_id = sc.id
FROM radar_scouts sc
WHERE sc.user_id = c.user_id AND c.scout_id IS NULL;

-- 4. Dedupe per scout instead of per user -------------------------------------
-- The old unique index made an article count once per user, so a second scout
-- could never evaluate it.
DROP INDEX IF EXISTS idx_radar_concepts_user_hash;
CREATE UNIQUE INDEX IF NOT EXISTS radar_concepts_scout_hash_uniq
  ON radar_concepts (scout_id, article_hash);

COMMIT;

-- Priorities stay in portal_user.settings.radar.priorities_markdown as well
-- (not deleted) so the old workflows can be restored at any time.

-- Verify:
--   SELECT count(*) FROM radar_scouts;                                   -- = number of Radar users
--   SELECT count(*) FROM radar_sources  WHERE scout_id IS NULL;           -- 0
--   SELECT count(*) FROM radar_concepts WHERE scout_id IS NULL;           -- 0

-- Rollback (only after restoring the pre-scout workflow backups):
--   BEGIN;
--   DROP INDEX IF EXISTS radar_concepts_scout_hash_uniq;
--   CREATE UNIQUE INDEX idx_radar_concepts_user_hash ON radar_concepts (user_id, article_hash);
--   ALTER TABLE radar_concepts DROP COLUMN IF EXISTS scout_id;
--   ALTER TABLE radar_sources  DROP COLUMN IF EXISTS scout_id;
--   DROP TABLE IF EXISTS radar_scouts;
--   COMMIT;
