-- Migration: Grant permissions on claims_anomaly schema
-- Description: Enable PostgREST API access to claims_anomaly schema and grant necessary permissions
-- Tables: claims_monthly, analysis_runs, anomalies, anomalies_history, client_month_reviews

-- Grant USAGE permission to access the schema
GRANT USAGE ON SCHEMA claims_anomaly TO anon, authenticated, service_role;

-- Grant ALL PRIVILEGES on all tables in the schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA claims_anomaly TO anon, authenticated, service_role;

-- Grant ALL PRIVILEGES on all sequences (for auto-increment IDs)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA claims_anomaly TO anon, authenticated, service_role;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA claims_anomaly GRANT ALL PRIVILEGES ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA claims_anomaly GRANT ALL PRIVILEGES ON SEQUENCES TO anon, authenticated, service_role;

-- Ensure schema owner is set correctly
ALTER SCHEMA claims_anomaly OWNER TO postgres;
