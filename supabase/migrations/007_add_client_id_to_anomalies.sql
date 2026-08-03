-- Migration: Add client_id to anomalies table
-- Description: Add client_id column for easier filtering and grouping
-- Also add index for faster queries
-- Schema: claims_anomaly

ALTER TABLE claims_anomaly.anomalies
ADD COLUMN client_id INT;

-- Update existing rows to populate client_id from claims_monthly table (if data exists)
UPDATE claims_anomaly.anomalies a
SET client_id = (
  SELECT DISTINCT c.client_id
  FROM claims_anomaly.claims_monthly c
  WHERE c.client_name = a.client_name
  LIMIT 1
)
WHERE client_id IS NULL;

-- Add index on client_id for faster filtering
CREATE INDEX idx_anomalies_client_id ON claims_anomaly.anomalies(client_id);

-- Update unique constraint to include client_id for better grouping
-- (This allows anomalies to be grouped by client_id + month instead of client_name)
ALTER TABLE claims_anomaly.anomalies
DROP CONSTRAINT anomalies_client_name_service_month_rule_violated_key;

ALTER TABLE claims_anomaly.anomalies
ADD CONSTRAINT anomalies_client_id_month_rule_key
UNIQUE(client_id, service_month, rule_violated);
