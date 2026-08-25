-- MRA VBC Opportunities: RPC Functions

-- Drop old version of get_work_queue_data (different signature)
DROP FUNCTION IF EXISTS mra_vbc_opps.get_work_queue_data(VARCHAR, INT, INT, INT, VARCHAR, VARCHAR, INT, INT) CASCADE;

-- Drop old version of get_providers_list (no parameters)
DROP FUNCTION IF EXISTS mra_vbc_opps.get_providers_list() CASCADE;

-- Get providers for UI dropdowns (filtered by user role)
CREATE OR REPLACE FUNCTION mra_vbc_opps.get_providers_list(p_user_email VARCHAR)
RETURNS TABLE (id INT, name VARCHAR, provider_group VARCHAR) AS $$
  WITH user_info AS (
    SELECT id, role FROM mra_vbc_opps.users WHERE email = p_user_email
  )
  SELECT p.id, p.name, p.provider_group
  FROM mra_vbc_opps.providers p
  WHERE 
    -- Admin sees all providers
    (SELECT role FROM user_info) = 'Admin'
    OR
    -- Coder sees only assigned providers
    p.id IN (
      SELECT pum.provider_id 
      FROM mra_vbc_opps.provider_user_mappings pum
      WHERE pum.user_id = (SELECT id FROM user_info)
    )
  ORDER BY p.name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.get_providers_list TO authenticated, authenticator, service_role;

-- Get provider IDs assigned to a user
-- TO DO: if this is being used for getting provider ids for displaying filter, this might need  name - group as english text
CREATE OR REPLACE FUNCTION mra_vbc_opps.get_user_provider_ids(p_user_id INT)
RETURNS TABLE (provider_id INT) AS $$
  SELECT provider_id FROM mra_vbc_opps.provider_user_mappings WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.get_user_provider_ids TO authenticated, authenticator, service_role;

-- List all users with assigned providers (Admin)
CREATE OR REPLACE FUNCTION mra_vbc_opps.list_users_admin()
RETURNS TABLE (
  id INT,
  email VARCHAR,
  role VARCHAR,
  created_at TIMESTAMP,
  providers INT[]
) AS $$
  SELECT
    u.id,
    u.email,
    u.role,
    u.created_at,
    ARRAY_AGG(pum.provider_id) FILTER (WHERE pum.provider_id IS NOT NULL)
  FROM mra_vbc_opps.users u
  LEFT JOIN mra_vbc_opps.provider_user_mappings pum ON u.id = pum.user_id
  GROUP BY u.id, u.email, u.role, u.created_at
  ORDER BY u.email;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.list_users_admin TO authenticated;

-- Get work queue data (member-grouped opportunities, paginated by member)
CREATE OR REPLACE FUNCTION mra_vbc_opps.get_work_queue_data(
  p_user_email VARCHAR,
  p_member_id INT DEFAULT NULL,
  p_provider_id INT DEFAULT NULL,
  p_payer_id INT DEFAULT NULL,
  p_initiative VARCHAR DEFAULT NULL,
  p_disposition_status VARCHAR DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  member_id VARCHAR,
  member_name VARCHAR,
  opp_count INT,
  opportunities JSONB,
  members_with_vbc_count INT,
  total_opportunities_count INT
) AS $$
  WITH user_info AS (
    SELECT id, role FROM mra_vbc_opps.users WHERE email = p_user_email
  ),
  filtered_opps AS (
    SELECT
      o.id,
      o.member_id,
      o.provider_id,
      o.payer_id,
      o.icd_10,
      o.icd_10_description,
      o.hcc_code,
      o.hcc_description,
      o.initiative,
      o.disposition_status,
      o.evidence,
      o.last_dos,
      p.name as provider_name,
      py.name as payer_name,
      m.member_id as member_id_str,
      pgp_sym_decrypt(m.name_encrypted, 'mra-vbc-opps-key')::VARCHAR as member_name_str,
      m.id as member_pk
    FROM mra_vbc_opps.opportunities o
    JOIN mra_vbc_opps.members m ON o.member_id = m.id
    JOIN mra_vbc_opps.providers p ON o.provider_id = p.id
    JOIN mra_vbc_opps.payers py ON o.payer_id = py.id
    JOIN user_info ui ON true
    WHERE o.is_current = true
      AND o.hcc_code IS NOT NULL
      AND (p_member_id IS NULL OR o.member_id = p_member_id)
      AND (p_provider_id IS NULL OR o.provider_id = p_provider_id)
      AND (p_payer_id IS NULL OR o.payer_id = p_payer_id)
      AND (p_initiative IS NULL OR o.initiative = p_initiative)
      AND (p_disposition_status IS NULL OR o.disposition_status = p_disposition_status)
      AND (ui.role = 'Admin' OR o.provider_id IN (
        SELECT provider_id FROM mra_vbc_opps.provider_user_mappings
        WHERE user_id = ui.id
      ))
  ),
  members_grouped AS (
    SELECT DISTINCT
      member_pk,
      member_id_str,
      member_name_str
    FROM filtered_opps
    ORDER BY member_id_str
  ),
  totals AS (
    SELECT 
      COUNT(DISTINCT member_pk)::INT as members_count,
      COUNT(*)::INT as opportunities_count
    FROM filtered_opps
  ),
  paginated_members AS (
    SELECT * FROM members_grouped
    LIMIT p_limit OFFSET p_offset
  )
  SELECT
    pm.member_id_str,
    pm.member_name_str,
    COUNT(fo.id)::INT as opp_count,
    COALESCE(JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', fo.id,
        'provider_name', fo.provider_name,
        'payer_name', fo.payer_name,
        'payer_id', fo.payer_id,
        'icd_10', fo.icd_10,
        'icd_10_description', fo.icd_10_description,
        'hcc_code', fo.hcc_code,
        'hcc_description', fo.hcc_description,
        'initiative', fo.initiative,
        'disposition_status', fo.disposition_status,
        'evidence', fo.evidence,
        'last_dos', fo.last_dos
      )
    ), '[]'::JSONB) as opportunities,
    (SELECT members_count FROM totals)::INT as members_with_vbc_count,
    (SELECT opportunities_count FROM totals)::INT as total_opportunities_count
  FROM paginated_members pm
  LEFT JOIN filtered_opps fo ON pm.member_pk = fo.member_pk
  GROUP BY pm.member_pk, pm.member_id_str, pm.member_name_str
  ORDER BY pm.member_id_str
$$ LANGUAGE sql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.get_work_queue_data TO authenticated, authenticator, service_role;

-- Search members by name or member_id
CREATE OR REPLACE FUNCTION mra_vbc_opps.search_members(search_query TEXT)
RETURNS TABLE(id INT, member_id VARCHAR, name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.member_id,
    pgp_sym_decrypt(m.name_encrypted, 'mra-vbc-opps-key')::VARCHAR as name
  FROM mra_vbc_opps.members m
  WHERE
    m.member_id ILIKE '%' || search_query || '%'
    OR pgp_sym_decrypt(m.name_encrypted, 'mra-vbc-opps-key')::VARCHAR ILIKE '%' || search_query || '%'
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.search_members TO authenticated;

-- Bulk CSV ingestion
CREATE OR REPLACE FUNCTION mra_vbc_opps.bulk_ingest_csv(
  p_upload_filename TEXT,
  p_uploaded_by TEXT,
  p_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_upload_id INT;
  v_inserted INT := 0;
  v_updated INT := 0;
  v_duplicates INT := 0;
  v_skipped INT := 0;
  v_non_hcc INT := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_opp_row JSONB;
  v_member_id INT;
  v_payer_id INT;
  v_provider_id INT;
  v_existing_opp_id INT;
  v_old_year_month VARCHAR(6);
  v_is_duplicate BOOLEAN;
  v_new_is_current BOOLEAN;
BEGIN
  INSERT INTO mra_vbc_opps.uploads (filename, uploaded_by, record_count)
  VALUES (p_upload_filename, p_uploaded_by, jsonb_array_length(p_data->'opportunities'))
  RETURNING id INTO v_upload_id;

  INSERT INTO mra_vbc_opps.members (member_id, name_encrypted, dob_encrypted)
  SELECT
    (row->>'member_id')::VARCHAR,
    pgp_sym_encrypt(row->>'member_name', 'mra-vbc-opps-key'),
    pgp_sym_encrypt((row->>'dob')::DATE::TEXT, 'mra-vbc-opps-key')
  FROM jsonb_array_elements(p_data->'members') AS row
  ON CONFLICT (member_id) DO NOTHING;

  INSERT INTO mra_vbc_opps.payers (name)
  SELECT DISTINCT row->>'payer_name'
  FROM jsonb_array_elements(p_data->'payers') AS row
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO mra_vbc_opps.providers (name, provider_group)
  SELECT DISTINCT row->>'provider_name', row->>'provider_group'
  FROM jsonb_array_elements(p_data->'providers') AS row
  ON CONFLICT (name, provider_group) DO NOTHING;

  FOR v_opp_row IN SELECT * FROM jsonb_array_elements(p_data->'opportunities')
  LOOP
    BEGIN
      SELECT id INTO v_member_id FROM mra_vbc_opps.members
        WHERE member_id = (v_opp_row->>'member_id')::VARCHAR;
      SELECT id INTO v_payer_id FROM mra_vbc_opps.payers
        WHERE name = v_opp_row->>'payer_name';
      SELECT id INTO v_provider_id FROM mra_vbc_opps.providers
        WHERE name = v_opp_row->>'provider_name' AND provider_group = v_opp_row->>'provider_group';

      IF v_member_id IS NULL OR v_payer_id IS NULL OR v_provider_id IS NULL THEN
        v_errors := array_append(v_errors, 'Row: Failed to resolve member/payer/provider');
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      IF v_opp_row->>'hcc_code' IS NULL OR v_opp_row->>'hcc_code' = '' THEN
        v_non_hcc := v_non_hcc + 1;
      END IF;

      -- Check if exact same opportunity already exists (all fields identical)
      SELECT EXISTS (
        SELECT 1 FROM mra_vbc_opps.opportunities
        WHERE member_id = v_member_id
          AND provider_id = v_provider_id
          AND payer_id = v_payer_id
          AND icd_10 IS NOT DISTINCT FROM v_opp_row->>'icd_10'
          AND icd_10_description IS NOT DISTINCT FROM v_opp_row->>'icd_10_description'
          AND hcc_code IS NOT DISTINCT FROM NULLIF(v_opp_row->>'hcc_code', '')
          AND hcc_description IS NOT DISTINCT FROM v_opp_row->>'hcc_description'
          AND initiative IS NOT DISTINCT FROM v_opp_row->>'initiative'
          AND evidence IS NOT DISTINCT FROM v_opp_row->>'evidence'
          AND last_dos IS NOT DISTINCT FROM NULLIF(v_opp_row->>'last_dos', '')::DATE
          AND source_file IS NOT DISTINCT FROM v_opp_row->>'source_file'
      ) INTO v_is_duplicate;

      IF v_is_duplicate THEN
        -- Exact duplicate: do nothing, just count it
        v_duplicates := v_duplicates + 1;
        CONTINUE;
      END IF;

      -- Check for existing opportunity with same key fields (may need updating)
      SELECT id, source_year_month INTO v_existing_opp_id, v_old_year_month FROM mra_vbc_opps.opportunities
        WHERE member_id = v_member_id
          AND provider_id = v_provider_id
          AND payer_id = v_payer_id
          AND icd_10 = v_opp_row->>'icd_10'
          AND is_current = true
        LIMIT 1;

      IF v_existing_opp_id IS NOT NULL THEN
        -- Different data detected: mark old as inactive, insert new
        IF (v_opp_row->>'source_year_month')::INTEGER >= v_old_year_month::INTEGER THEN
          UPDATE mra_vbc_opps.opportunities SET is_current = false WHERE id = v_existing_opp_id;
          v_new_is_current := true;
        ELSE
          v_new_is_current := false;
        END IF;
        v_updated := v_updated + 1;
      ELSE
        v_new_is_current := true;
        v_inserted := v_inserted + 1;
      END IF;

      INSERT INTO mra_vbc_opps.opportunities (
        member_id, provider_id, payer_id, upload_id,
        icd_10, icd_10_description, hcc_code, hcc_description,
        initiative, evidence, last_dos, source_file, source_year_month,
        disposition_status, is_current
      ) VALUES (
        v_member_id, v_provider_id, v_payer_id, v_upload_id,
        v_opp_row->>'icd_10', v_opp_row->>'icd_10_description',
        NULLIF(v_opp_row->>'hcc_code', ''), v_opp_row->>'hcc_description',
        v_opp_row->>'initiative', v_opp_row->>'evidence',
        NULLIF(v_opp_row->>'last_dos', '')::DATE, v_opp_row->>'source_file',
        v_opp_row->>'source_year_month',
        'Open', v_new_is_current
      );

      INSERT INTO mra_vbc_opps.member_identifiers (member_id, payer_id, policy_number)
      VALUES (v_member_id, v_payer_id, v_opp_row->>'policy_number')
      ON CONFLICT DO NOTHING;

    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Row: ' || SQLERRM);
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', v_skipped = 0,
    'upload_id', v_upload_id,
    'counts', jsonb_build_object(
      'inserted', v_inserted,
      'updated', v_updated,
      'duplicates', v_duplicates,
      'skipped', v_skipped,
      'non_hcc', v_non_hcc
    ),
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.bulk_ingest_csv TO authenticated;

