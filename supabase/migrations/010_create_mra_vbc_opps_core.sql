-- MRA VBC Opportunities: Core Schema & Tables
CREATE SCHEMA IF NOT EXISTS mra_vbc_opps;

CREATE TABLE IF NOT EXISTS mra_vbc_opps.payers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
);

CREATE TABLE IF NOT EXISTS mra_vbc_opps.providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider_group VARCHAR(255) NOT NULL,
  UNIQUE(name, provider_group),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
);

CREATE TABLE IF NOT EXISTS mra_vbc_opps.members (
  id SERIAL PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL UNIQUE,
  name_encrypted BYTEA NOT NULL,
  dob_encrypted BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
);

CREATE TABLE IF NOT EXISTS mra_vbc_opps.member_identifiers (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES mra_vbc_opps.members(id),
  payer_id INTEGER NOT NULL REFERENCES mra_vbc_opps.payers(id),
  policy_number VARCHAR(100) NOT NULL,
  UNIQUE(member_id, payer_id, policy_number),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
);

CREATE TABLE IF NOT EXISTS mra_vbc_opps.uploads (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  record_count INTEGER NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
);

CREATE TABLE IF NOT EXISTS mra_vbc_opps.opportunities (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES mra_vbc_opps.members(id),
  provider_id INTEGER NOT NULL REFERENCES mra_vbc_opps.providers(id),
  payer_id INTEGER NOT NULL REFERENCES mra_vbc_opps.payers(id),
  upload_id INTEGER NOT NULL REFERENCES mra_vbc_opps.uploads(id),
  icd_10 VARCHAR(10) NOT NULL,
  icd_10_description VARCHAR(500),
  hcc_code VARCHAR(10),
  hcc_description VARCHAR(500),
  initiative VARCHAR(100) NOT NULL,
  evidence TEXT,
  last_dos DATE,
  source_file VARCHAR(255),
  disposition_status VARCHAR(50) DEFAULT 'Open',
  is_current BOOLEAN DEFAULT true,
  UNIQUE(member_id, provider_id, payer_id, icd_10, source_file),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
);

CREATE TABLE IF NOT EXISTS mra_vbc_opps.dispositions (
  id SERIAL PRIMARY KEY,
  opportunity_id INTEGER NOT NULL REFERENCES mra_vbc_opps.opportunities(id),
  status VARCHAR(50) NOT NULL,
  justification TEXT NOT NULL,
  set_by VARCHAR(255) NOT NULL,
  set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
  previous_status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS mra_vbc_opps.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
);

CREATE TABLE IF NOT EXISTS mra_vbc_opps.provider_user_mappings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES mra_vbc_opps.users(id),
  provider_id INTEGER NOT NULL REFERENCES mra_vbc_opps.providers(id),
  UNIQUE(user_id, provider_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_opportunities_member_provider_payer ON mra_vbc_opps.opportunities(member_id, provider_id, payer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_provider ON mra_vbc_opps.opportunities(provider_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_payer ON mra_vbc_opps.opportunities(payer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_initiative ON mra_vbc_opps.opportunities(initiative);
CREATE INDEX IF NOT EXISTS idx_opportunities_disposition_status ON mra_vbc_opps.opportunities(disposition_status);
CREATE INDEX IF NOT EXISTS idx_opportunities_is_current ON mra_vbc_opps.opportunities(is_current);
CREATE INDEX IF NOT EXISTS idx_opportunities_is_current_hcc ON mra_vbc_opps.opportunities(is_current, hcc_code);
CREATE INDEX IF NOT EXISTS idx_dispositions_opportunity ON mra_vbc_opps.dispositions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_member_identifiers_member_payer ON mra_vbc_opps.member_identifiers(member_id, payer_id);
CREATE INDEX IF NOT EXISTS idx_provider_user_mappings_user ON mra_vbc_opps.provider_user_mappings(user_id);
