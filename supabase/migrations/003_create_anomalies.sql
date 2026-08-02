-- Migration: Create anomalies table
-- Description: Detected anomalies with versioning by analysis run
-- Schema: claims-anomaly

CREATE TYPE "claims-anomaly".anomaly_status AS ENUM ('active', 'resolved');
CREATE TYPE "claims-anomaly".confidence_level AS ENUM ('low', 'medium', 'high');

CREATE TABLE IF NOT EXISTS "claims-anomaly".anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id UUID NOT NULL REFERENCES "claims-anomaly".analysis_runs(id) ON DELETE CASCADE,
  client_name VARCHAR(50) NOT NULL,
  service_month DATE NOT NULL,
  affected_metrics TEXT NOT NULL,
  confidence "claims-anomaly".confidence_level NOT NULL,
  notes TEXT,
  status "claims-anomaly".anomaly_status NOT NULL DEFAULT 'active',
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(analysis_run_id, client_name, service_month)
);

CREATE INDEX idx_anomalies_analysis_run ON "claims-anomaly".anomalies(analysis_run_id);
CREATE INDEX idx_anomalies_client_month ON "claims-anomaly".anomalies(client_name, service_month);
CREATE INDEX idx_anomalies_status ON "claims-anomaly".anomalies(status);
CREATE INDEX idx_anomalies_detected_at ON "claims-anomaly".anomalies(detected_at DESC);
