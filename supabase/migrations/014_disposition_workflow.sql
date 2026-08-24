-- MRA VBC Opportunities: Complete disposition workflow with audit trail
-- This is the consolidated migration replacing 014, 016, 017, 018, 019

-- Add disposition columns to opportunities table
ALTER TABLE mra_vbc_opps.opportunities
ADD COLUMN IF NOT EXISTS disposition_status VARCHAR(50) DEFAULT 'Open',
ADD COLUMN IF NOT EXISTS disposition_note TEXT,
ADD COLUMN IF NOT EXISTS disposition_changed_at TIMESTAMP WITH TIME ZONE;

-- Create disposition_history table for full audit trail
CREATE TABLE IF NOT EXISTS mra_vbc_opps.disposition_history (
  id BIGSERIAL PRIMARY KEY,
  opportunity_id INT NOT NULL REFERENCES mra_vbc_opps.opportunities(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_user_id INT NOT NULL REFERENCES mra_vbc_opps.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  justification_note TEXT,
  CONSTRAINT valid_status CHECK (new_status IN ('Open', 'Confirmed', 'Denied', 'Pending Chart', 'Referred to Provider'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_disposition_history_opp ON mra_vbc_opps.disposition_history(opportunity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_disposition_history_user ON mra_vbc_opps.disposition_history(changed_by_user_id);

-- Drop old versions with any signature to avoid conflicts
DROP FUNCTION IF EXISTS mra_vbc_opps.set_opportunity_dispositions CASCADE;
DROP FUNCTION IF EXISTS mra_vbc_opps.get_member_opportunities_with_history CASCADE;

-- RPC: Set opportunity dispositions (bulk or single)
CREATE OR REPLACE FUNCTION mra_vbc_opps.set_opportunity_dispositions(
  p_user_email VARCHAR,
  p_opportunity_ids INT[],
  p_disposition_status VARCHAR,
  p_justification_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id INT;
  v_user_role VARCHAR;
  v_updated_count INT := 0;
  v_skipped_count INT := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_opp_id INT;
  v_old_status VARCHAR(50);
BEGIN
  -- Get user info
  SELECT id, role INTO v_user_id, v_user_role FROM mra_vbc_opps.users WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Validate disposition_status
  IF p_disposition_status NOT IN ('Open', 'Confirmed', 'Denied', 'Pending Chart', 'Referred to Provider') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid disposition status');
  END IF;

  -- Process each opportunity
  FOREACH v_opp_id IN ARRAY p_opportunity_ids LOOP
    BEGIN
      -- Check access: Admin can update all, Coder can only update assigned providers
      IF v_user_role != 'Admin' THEN
        IF NOT EXISTS (
          SELECT 1 FROM mra_vbc_opps.opportunities o
          JOIN mra_vbc_opps.provider_user_mappings pum ON o.provider_id = pum.provider_id
          WHERE o.id = v_opp_id AND pum.user_id = v_user_id
        ) THEN
          v_skipped_count := v_skipped_count + 1;
          CONTINUE;
        END IF;
      END IF;

      -- Get old status
      SELECT disposition_status INTO v_old_status FROM mra_vbc_opps.opportunities WHERE id = v_opp_id;
      
      IF v_old_status IS NULL THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Update opportunity disposition
      UPDATE mra_vbc_opps.opportunities
      SET disposition_status = p_disposition_status,
          disposition_note = p_justification_note,
          disposition_changed_at = NOW()
      WHERE id = v_opp_id;

      -- Create history entry
      INSERT INTO mra_vbc_opps.disposition_history (opportunity_id, old_status, new_status, changed_by_user_id, justification_note)
      VALUES (v_opp_id, v_old_status, p_disposition_status, v_user_id, p_justification_note);

      v_updated_count := v_updated_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Opportunity ' || v_opp_id || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', v_updated_count > 0,
    'updated_count', v_updated_count,
    'skipped_count', v_skipped_count,
    'errors', CASE WHEN array_length(v_errors, 1) > 0 THEN v_errors ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get all opportunities for a member with disposition history (for member review page)
CREATE OR REPLACE FUNCTION mra_vbc_opps.get_member_opportunities_with_history(
  p_user_email VARCHAR,
  p_member_id VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_user_id INT;
  v_user_role VARCHAR;
  v_member_pk INT;
  v_result JSONB;
BEGIN
  -- Get user info
  SELECT id, role INTO v_user_id, v_user_role FROM mra_vbc_opps.users WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Look up member database ID from member_id string (done inside RPC which has SECURITY DEFINER)
  SELECT id INTO v_member_pk FROM mra_vbc_opps.members WHERE member_id = p_member_id;
  
  IF v_member_pk IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;

  -- Build result with member and opportunities using CTEs to avoid nested aggregates
  WITH member_data AS (
    SELECT
      m.id,
      m.member_id,
      pgp_sym_decrypt(m.name_encrypted, 'mra-vbc-opps-key')::VARCHAR as member_name
    FROM mra_vbc_opps.members m
    WHERE m.id = v_member_pk
  ),
  opp_history AS (
    SELECT
      o.id as opp_id,
      jsonb_agg(
        jsonb_build_object(
          'id', dh.id,
          'old_status', dh.old_status,
          'new_status', dh.new_status,
          'changed_by_email', u.email,
          'changed_at', dh.changed_at,
          'justification_note', dh.justification_note
        )
        ORDER BY dh.changed_at DESC
      ) FILTER (WHERE dh.id IS NOT NULL) as history
    FROM mra_vbc_opps.opportunities o
    LEFT JOIN mra_vbc_opps.disposition_history dh ON o.id = dh.opportunity_id
    LEFT JOIN mra_vbc_opps.users u ON dh.changed_by_user_id = u.id
    WHERE o.member_id = v_member_pk
      AND o.is_current = true
      AND o.hcc_code IS NOT NULL
    GROUP BY o.id
  ),
  filtered_opps AS (
    SELECT
      o.id,
      o.payer_id,
      o.icd_10,
      o.icd_10_description,
      o.hcc_code,
      o.hcc_description,
      o.initiative,
      o.evidence,
      o.last_dos,
      o.disposition_status,
      o.disposition_note,
      o.disposition_changed_at,
      o.created_at,
      p.name as provider_name,
      py.name as payer_name,
      COALESCE(oh.history, '[]'::JSONB) as history
    FROM mra_vbc_opps.opportunities o
    JOIN mra_vbc_opps.providers p ON o.provider_id = p.id
    JOIN mra_vbc_opps.payers py ON o.payer_id = py.id
    LEFT JOIN opp_history oh ON o.id = oh.opp_id
    WHERE o.member_id = v_member_pk
      AND o.is_current = true
      AND o.hcc_code IS NOT NULL
      AND (v_user_role = 'Admin' OR o.provider_id IN (
        SELECT provider_id FROM mra_vbc_opps.provider_user_mappings
        WHERE user_id = v_user_id
      ))
    ORDER BY o.id
  )
  SELECT jsonb_build_object(
    'success', true,
    'member', jsonb_build_object(
      'id', m.id,
      'member_id', m.member_id,
      'member_name', m.member_name
    ),
    'opportunities', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', fo.id,
          'provider_name', fo.provider_name,
          'payer_name', fo.payer_name,
          'payer_id', fo.payer_id,
          'icd_10', fo.icd_10,
          'icd_10_description', fo.icd_10_description,
          'hcc_code', fo.hcc_code,
          'hcc_description', fo.hcc_description,
          'initiative', fo.initiative,
          'evidence', fo.evidence,
          'last_dos', fo.last_dos,
          'disposition_status', fo.disposition_status,
          'disposition_note', fo.disposition_note,
          'disposition_changed_at', fo.disposition_changed_at,
          'created_at', fo.created_at,
          'history', fo.history
        )
      ),
      '[]'::JSONB
    )
  )
  INTO v_result
  FROM member_data m
  LEFT JOIN filtered_opps fo ON true
  GROUP BY m.id, m.member_id, m.member_name;

  RETURN COALESCE(v_result, jsonb_build_object('success', false, 'error', 'Member not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions with explicit function signatures
GRANT EXECUTE ON FUNCTION mra_vbc_opps.set_opportunity_dispositions(VARCHAR, INT[], VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mra_vbc_opps.get_member_opportunities_with_history(VARCHAR, VARCHAR) TO authenticated;
