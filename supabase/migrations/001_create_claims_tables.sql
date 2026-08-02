-- Migration: Create claims_monthly table
-- Description: Stores raw claims data from uploaded CSVs
-- Schema: claims-anomaly

CREATE SCHEMA IF NOT EXISTS "claims-anomaly";

CREATE TABLE IF NOT EXISTS "claims-anomaly".claims_monthly (
  id BIGSERIAL PRIMARY KEY,
  client_id INT NOT NULL,
  client_name VARCHAR(50) NOT NULL,
  service_month DATE NOT NULL,
  count_eligible_primary_members INT,
  num_unique_claims_medical INT,
  num_unique_claims_rx INT,
  num_service_lines_medical INT,
  num_service_lines_rx INT,
  total_plan_pay_medical DECIMAL(12, 2),
  total_plan_pay_rx DECIMAL(12, 2),
  total_garner_incentive_paid_medical DECIMAL(12, 2),
  total_garner_incentive_paid_rx DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, service_month)
);

CREATE INDEX idx_claims_monthly_client_month ON "claims-anomaly".claims_monthly(client_id, service_month);
CREATE INDEX idx_claims_monthly_service_month ON "claims-anomaly".claims_monthly(service_month);
