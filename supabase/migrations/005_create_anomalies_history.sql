-- Migration: Create anomalies_history table
-- Description: Historical record of all anomaly detections across weekly feeds
-- Tracks progression of anomalies: when detected, status changes
-- Schema: claims_anomaly

CREATE TABLE IF NOT EXISTS claims_anomaly.anomalies_history (
  id BIGSERIAL PRIMARY KEY,
  anomaly_id UUID NOT NULL REFERENCES claims_anomaly.anomalies(id) ON DELETE CASCADE,
  analysis_run_id UUID NOT NULL REFERENCES claims_anomaly.analysis_runs(id) ON DELETE CASCADE,
  rule_violated VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'detected', 'resolved'
  notes TEXT,
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anomalies_history_anomaly ON claims_anomaly.anomalies_history(anomaly_id);
CREATE INDEX idx_anomalies_history_run ON claims_anomaly.anomalies_history(analysis_run_id);
CREATE INDEX idx_anomalies_history_detected ON claims_anomaly.anomalies_history(detected_at DESC);
