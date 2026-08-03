-- Migration: Create anomalies table (current/active anomalies)
-- Description: Current state of anomalies grouped by (client_name, service_month, rule_violated)
-- Tracks first_seen, last_seen, and recurrence_count across weekly feeds
-- Schema: claims_anomaly

CREATE TABLE IF NOT EXISTS claims_anomaly.anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(255) NOT NULL,
  service_month DATE NOT NULL,
  rule_violated VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'persistent', 'resolved', 'reopened'
  confidence VARCHAR(50), -- 'low', 'medium', 'high'
  affected_metrics TEXT,
  notes TEXT,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recurrence_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(client_name, service_month, rule_violated)
);

CREATE INDEX idx_anomalies_status ON claims_anomaly.anomalies(status);
CREATE INDEX idx_anomalies_client_month ON claims_anomaly.anomalies(client_name, service_month);
CREATE INDEX idx_anomalies_rule ON claims_anomaly.anomalies(rule_violated);
CREATE INDEX idx_anomalies_last_seen ON claims_anomaly.anomalies(last_seen_at DESC);
