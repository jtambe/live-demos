-- MRA VBC Opportunities: RPC Functions

-- Get providers for UI dropdowns
CREATE OR REPLACE FUNCTION mra_vbc_opps.get_providers_list()
RETURNS TABLE (id INT, name VARCHAR, provider_group VARCHAR) AS $$
  SELECT id, name, provider_group FROM mra_vbc_opps.providers ORDER BY name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.get_providers_list TO authenticated;

-- Get provider IDs assigned to a user
CREATE OR REPLACE FUNCTION mra_vbc_opps.get_user_provider_ids(p_user_id INT)
RETURNS TABLE (provider_id INT) AS $$
  SELECT provider_id FROM mra_vbc_opps.provider_user_mappings WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.get_user_provider_ids TO authenticated;

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

-- Get work queue data (member-grouped opportunities)
CREATE OR REPLACE FUNCTION mra_vbc_opps.get_work_queue_data(
  p_member_id INT DEFAULT NULL,
  p_provider_id INT DEFAULT NULL,
  p_payer_id INT DEFAULT NULL,
  p_initiative VARCHAR DEFAULT NULL,
  p_disposition_status VARCHAR DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  member_pk INT,
  member_id VARCHAR,
  member_name VARCHAR,
  opp_count INT,
  opportunities JSONB,
  total_count INT
) AS $$
  WITH filtered_opps AS (
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
      m.member_id as member_id_str,
      m.name as member_name_str,
      m.id as member_pk,
      ROW_NUMBER() OVER (ORDER BY o.member_id) as rn,
      COUNT(*) OVER () as total
    FROM mra_vbc_opps.opportunities o
    JOIN mra_vbc_opps.members m ON o.member_id = m.id
    JOIN mra_vbc_opps.providers p ON o.provider_id = p.id
    WHERE o.is_current = true
      AND o.hcc_code IS NOT NULL
      AND (p_member_id IS NULL OR o.member_id = p_member_id)
      AND (p_provider_id IS NULL OR o.provider_id = p_provider_id)
      AND (p_payer_id IS NULL OR o.payer_id = p_payer_id)
      AND (p_initiative IS NULL OR o.initiative = p_initiative)
      AND (p_disposition_status IS NULL OR o.disposition_status = p_disposition_status)
  ),
  paginated AS (
    SELECT * FROM filtered_opps
    WHERE rn BETWEEN (p_offset + 1) AND (p_offset + p_limit)
  ),
  grouped AS (
    SELECT
      fo.member_pk,
      fo.member_id_str,
      fo.member_name_str,
      COUNT(*)::INT as opp_count,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', fo.id,
          'member_id', fo.member_id,
          'provider_id', fo.provider_id,
          'provider_name', fo.provider_name,
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
      ) as opps_json,
      MAX(fo.total)::INT as total
    FROM paginated fo
    GROUP BY fo.member_pk, fo.member_id_str, fo.member_name_str
  )
  SELECT
    member_pk,
    member_id_str,
    member_name_str,
    opp_count,
    opps_json,
    total
  FROM grouped;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.get_work_queue_data TO authenticated;

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
  v_skipped INT := 0;
  v_non_hcc INT := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_opp_row JSONB;
  v_member_id INT;
  v_payer_id INT;
  v_provider_id INT;
  v_existing_opp_id INT;
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

      SELECT id INTO v_existing_opp_id FROM mra_vbc_opps.opportunities
        WHERE member_id = v_member_id
          AND provider_id = v_provider_id
          AND payer_id = v_payer_id
          AND icd_10 = v_opp_row->>'icd_10'
          AND is_current = true
        LIMIT 1;

      IF v_existing_opp_id IS NOT NULL THEN
        UPDATE mra_vbc_opps.opportunities SET is_current = false WHERE id = v_existing_opp_id;
        v_updated := v_updated + 1;
      ELSE
        v_inserted := v_inserted + 1;
      END IF;

      INSERT INTO mra_vbc_opps.opportunities (
        member_id, provider_id, payer_id, upload_id,
        icd_10, icd_10_description, hcc_code, hcc_description,
        initiative, evidence, last_dos, source_file,
        disposition_status, is_current
      ) VALUES (
        v_member_id, v_provider_id, v_payer_id, v_upload_id,
        v_opp_row->>'icd_10', v_opp_row->>'icd_10_description',
        NULLIF(v_opp_row->>'hcc_code', ''), v_opp_row->>'hcc_description',
        v_opp_row->>'initiative', v_opp_row->>'evidence',
        NULLIF(v_opp_row->>'last_dos', '')::DATE, v_opp_row->>'source_file',
        'Open', true
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
      'skipped', v_skipped,
      'non_hcc', v_non_hcc
    ),
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.bulk_ingest_csv TO authenticated;
