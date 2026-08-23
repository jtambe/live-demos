-- MRA VBC Opportunities: Encryption, RLS, Permissions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function for getting current user's email from JWT
CREATE OR REPLACE FUNCTION mra_vbc_opps.current_user_email() RETURNS text AS $$
  SELECT auth.jwt() ->> 'email'
$$ LANGUAGE SQL STABLE;

-- Enable RLS on opportunities
ALTER TABLE mra_vbc_opps.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Provider scoping (Coders + Admins)
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

-- RLS Policy: Coders can update opportunities for their assigned providers
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
CREATE POLICY coder_insert_disposition_policy ON mra_vbc_opps.dispositions
FOR INSERT
WITH CHECK (
  (SELECT role FROM mra_vbc_opps.users WHERE email = mra_vbc_opps.current_user_email()) IN ('Coder', 'Admin')
);

-- Grant permissions: authenticated only (RLS enforces row-level access)
GRANT USAGE ON SCHEMA mra_vbc_opps TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA mra_vbc_opps TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mra_vbc_opps GRANT SELECT ON TABLES TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mra_vbc_opps TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mra_vbc_opps GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mra_vbc_opps TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mra_vbc_opps GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA mra_vbc_opps TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mra_vbc_opps GRANT EXECUTE ON FUNCTIONS TO authenticated;
