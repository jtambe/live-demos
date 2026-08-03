-- Migration: Clean slate - drop all old tables, indexes, and types
-- Run this FIRST if you have old schema/tables to clean up
-- Then run: DELETE FROM supabase_migrations.schema_migrations;

-- Drop tables (cascade will remove dependent objects)
DROP TABLE IF EXISTS claims_anomaly.anomaly_feedback CASCADE;
DROP TABLE IF EXISTS claims_anomaly.anomalies_history CASCADE;
DROP TABLE IF EXISTS claims_anomaly.anomalies CASCADE;
DROP TABLE IF EXISTS claims_anomaly.analysis_runs CASCADE;
DROP TABLE IF EXISTS claims_anomaly.claims_monthly CASCADE;

-- Drop ENUM types (if they exist from old schema)
DROP TYPE IF EXISTS claims_anomaly.anomaly_status CASCADE;
DROP TYPE IF EXISTS claims_anomaly.confidence_level CASCADE;

-- Drop all indexes in schema (in case any were orphaned)
DROP INDEX IF EXISTS claims_anomaly.idx_claims_monthly_client_month CASCADE;
DROP INDEX IF EXISTS claims_anomaly.idx_anomalies_analysis_run CASCADE;
DROP INDEX IF EXISTS claims_anomaly.idx_anomalies_client_month CASCADE;
DROP INDEX IF EXISTS claims_anomaly.idx_anomalies_status CASCADE;
DROP INDEX IF EXISTS claims_anomaly.idx_anomalies_detected_at CASCADE;
DROP INDEX IF EXISTS claims_anomaly.idx_anomalies_user_feedback CASCADE;

-- Drop schema itself (optional - only if you want complete reset)
-- DROP SCHEMA IF EXISTS claims_anomaly CASCADE;

-- Then after running this, execute:
-- DELETE FROM supabase_migrations.schema_migrations;
-- supabase migration up
