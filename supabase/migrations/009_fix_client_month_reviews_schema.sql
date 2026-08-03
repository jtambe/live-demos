-- Fix service_month column size in client_month_reviews table
ALTER TABLE claims_anomaly.client_month_reviews ALTER COLUMN service_month TYPE VARCHAR(10);
