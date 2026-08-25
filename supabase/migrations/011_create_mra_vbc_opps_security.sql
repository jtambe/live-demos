-- MRA VBC Opportunities: Encryption, RLS, Permissions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function for getting current user's email from JWT
CREATE OR REPLACE FUNCTION mra_vbc_opps.current_user_email() RETURNS text AS $$
  SELECT auth.jwt() ->> 'email'
$$ LANGUAGE SQL STABLE;

-- Enable RLS on opportunities
ALTER TABLE mra_vbc_opps.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Provider scoping (Coders + Admins)
DROP POLICY IF EXISTS provider_scoping_policy ON mra_vbc_opps.opportunities;
CREATE POLICY provider_scoping_policy ON mra_vbc_opps.opportunities
FOR SELECT
USING (
  provider_id IN (
    SELECT provider_id FROM mra_vbc_opps.provider_user_mappings
    WHERE user_id = (
      SELECT id FROM mra_vbc_opps.users
      WHERE email = mra_vbc_opps.current_user_email()
    )
  )
  OR
  (SELECT role FROM mra_vbc_opps.users WHERE email = mra_vbc_opps.current_user_email()) = 'Admin'
);

-- RLS Policy: Allow authenticated users (Admin/Coder) to insert opportunities
DROP POLICY IF EXISTS insert_opportunities_policy ON mra_vbc_opps.opportunities;
CREATE POLICY insert_opportunities_policy ON mra_vbc_opps.opportunities
FOR INSERT
WITH CHECK (
  (SELECT role FROM mra_vbc_opps.users WHERE email = mra_vbc_opps.current_user_email()) IN ('Admin', 'Coder')
);


-- RLS Policy: Coders can update opportunities for their assigned providers
DROP POLICY IF EXISTS coder_update_disposition_policy ON mra_vbc_opps.opportunities;
CREATE POLICY coder_update_disposition_policy ON mra_vbc_opps.opportunities
FOR UPDATE
USING (
  provider_id IN (
    SELECT provider_id FROM mra_vbc_opps.provider_user_mappings
    WHERE user_id = (SELECT id FROM mra_vbc_opps.users WHERE email = mra_vbc_opps.current_user_email())
  )
  OR (SELECT role FROM mra_vbc_opps.users WHERE email = mra_vbc_opps.current_user_email()) = 'Admin'
)
WITH CHECK (
  provider_id IN (
    SELECT provider_id FROM mra_vbc_opps.provider_user_mappings
    WHERE user_id = (SELECT id FROM mra_vbc_opps.users WHERE email = mra_vbc_opps.current_user_email())
  )
  OR (SELECT role FROM mra_vbc_opps.users WHERE email = mra_vbc_opps.current_user_email()) = 'Admin'
);

-- RLS Policy: Coder dispositions
DROP POLICY IF EXISTS coder_insert_disposition_policy ON mra_vbc_opps.dispositions;
CREATE POLICY coder_insert_disposition_policy ON mra_vbc_opps.dispositions
FOR INSERT
WITH CHECK (
  (SELECT role FROM mra_vbc_opps.users WHERE email = mra_vbc_opps.current_user_email()) IN ('Coder', 'Admin')
);

-- Grant permissions: authenticated, authenticator (PostgREST), and service_role
-- authenticator is the PostgREST connection role that needs schema access
GRANT USAGE ON SCHEMA mra_vbc_opps TO authenticated, authenticator, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA mra_vbc_opps TO authenticated, authenticator, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mra_vbc_opps GRANT SELECT ON TABLES TO authenticated, authenticator, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mra_vbc_opps TO authenticated, authenticator, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mra_vbc_opps GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated, authenticator, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mra_vbc_opps TO authenticated, authenticator, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mra_vbc_opps GRANT USAGE, SELECT ON SEQUENCES TO authenticated, authenticator, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA mra_vbc_opps TO authenticated, authenticator, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mra_vbc_opps GRANT EXECUTE ON FUNCTIONS TO authenticated, authenticator, service_role;
