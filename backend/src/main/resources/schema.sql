CREATE TABLE IF NOT EXISTS runs (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  alias VARCHAR(20) NOT NULL,
  distance INT NOT NULL DEFAULT 0,
  tokens INT NOT NULL DEFAULT 0,
  elapsed_ms BIGINT NOT NULL DEFAULT 0,
  finished BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  nationality_code VARCHAR(2) NOT NULL DEFAULT 'ZZ',
  course_version VARCHAR(30) NOT NULL,
  level_length INT NOT NULL,
  collision_id VARCHAR(32)
);
CREATE INDEX IF NOT EXISTS runs_player ON runs(player_id, created_at);
CREATE TABLE IF NOT EXISTS checkpoints (
  run_id VARCHAR(36) NOT NULL REFERENCES runs(id),
  checkpoint_no INT NOT NULL,
  distance INT NOT NULL,
  tokens INT NOT NULL,
  elapsed_ms BIGINT NOT NULL,
  PRIMARY KEY (run_id, checkpoint_no)
);
CREATE TABLE IF NOT EXISTS nationalities (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);
