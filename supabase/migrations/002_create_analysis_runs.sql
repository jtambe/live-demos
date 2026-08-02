-- Migration: Create analysis_runs table
-- Description: Metadata about each anomaly analysis run
-- Schema: claims-anomaly

CREATE TABLE IF NOT EXISTS "claims-anomaly".analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash VARCHAR(64) NOT NULL UNIQUE,
  upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_path VARCHAR(255),
  original_filename VARCHAR(255),
  data_period_start DATE,
  data_period_end DATE,
  row_count INT,
  anomalies_found INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_runs_file_hash ON "claims-anomaly".analysis_runs(file_hash);
CREATE INDEX idx_analysis_runs_upload_date ON "claims-anomaly".analysis_runs(upload_date DESC);
