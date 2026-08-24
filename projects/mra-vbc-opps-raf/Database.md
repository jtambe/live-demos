## Table `payers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `name` | `varchar` |  Unique |
| `created_at` | `timestamptz` |  Nullable |

## Table `providers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `name` | `varchar` |  |
| `provider_group` | `varchar` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `member_id` | `varchar` |  Unique |
| `name_encrypted` | `bytea` |  |
| `dob_encrypted` | `bytea` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `member_identifiers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `member_id` | `int4` |  |
| `payer_id` | `int4` |  |
| `policy_number` | `varchar` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `uploads`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `filename` | `varchar` |  |
| `uploaded_by` | `varchar` |  |
| `record_count` | `int4` |  |
| `uploaded_at` | `timestamptz` |  Nullable |

## Table `opportunities`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `member_id` | `int4` |  |
| `provider_id` | `int4` |  |
| `payer_id` | `int4` |  |
| `upload_id` | `int4` |  |
| `icd_10` | `varchar` |  |
| `icd_10_description` | `varchar` |  Nullable |
| `hcc_code` | `varchar` |  Nullable |
| `hcc_description` | `varchar` |  Nullable |
| `initiative` | `varchar` |  |
| `evidence` | `text` |  Nullable |
| `last_dos` | `date` |  Nullable |
| `source_file` | `varchar` |  Nullable |
| `source_year_month` | `varchar` |  Nullable |
| `disposition_status` | `varchar` |  Nullable |
| `is_current` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `disposition_note` | `text` |  Nullable |
| `disposition_changed_at` | `timestamptz` |  Nullable |

## Table `dispositions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `opportunity_id` | `int4` |  |
| `status` | `varchar` |  |
| `justification` | `text` |  |
| `set_by` | `varchar` |  |
| `set_at` | `timestamptz` |  Nullable |
| `previous_status` | `varchar` |  Nullable |

## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `email` | `varchar` |  Unique |
| `password_hash` | `varchar` |  |
| `role` | `varchar` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `provider_user_mappings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `user_id` | `int4` |  |
| `provider_id` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `test_people`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `name` | `varchar` |  Nullable |
| `gender` | `varchar` |  Nullable |
| `country` | `varchar` |  Nullable |
| `date_of_birth` | `date` |  Nullable |

## Table `disposition_history`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `opportunity_id` | `int4` |  |
| `old_status` | `varchar` |  Nullable |
| `new_status` | `varchar` |  |
| `changed_by_user_id` | `int4` |  |
| `changed_at` | `timestamptz` |  |
| `justification_note` | `text` |  Nullable |

## RLS Policies

### `opportunities`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `provider_scoping_policy` | SELECT | public | PERMISSIVE | `((provider_id IN ( SELECT provider_user_mappings.provider_id    FROM mra_vbc_opps.provider_user_mappings   WHERE (provider_user_mappings.user_id = ( SELECT users.id            FROM mra_vbc_opps.users           WHERE ((users.email)::text = mra_vbc_opps.current_user_email()))))) OR ((( SELECT users.role    FROM mra_vbc_opps.users   WHERE ((users.email)::text = mra_vbc_opps.current_user_email())))::text = 'Admin'::text))` | — |
| `insert_opportunities_policy` | INSERT | public | PERMISSIVE | — | `((( SELECT users.role    FROM mra_vbc_opps.users   WHERE ((users.email)::text = mra_vbc_opps.current_user_email())))::text = ANY ((ARRAY['Admin'::character varying, 'Coder'::character varying])::text[]))` |
| `coder_update_disposition_policy` | UPDATE | public | PERMISSIVE | `((provider_id IN ( SELECT provider_user_mappings.provider_id    FROM mra_vbc_opps.provider_user_mappings   WHERE (provider_user_mappings.user_id = ( SELECT users.id            FROM mra_vbc_opps.users           WHERE ((users.email)::text = mra_vbc_opps.current_user_email()))))) OR ((( SELECT users.role    FROM mra_vbc_opps.users   WHERE ((users.email)::text = mra_vbc_opps.current_user_email())))::text = 'Admin'::text))` | `((provider_id IN ( SELECT provider_user_mappings.provider_id    FROM mra_vbc_opps.provider_user_mappings   WHERE (provider_user_mappings.user_id = ( SELECT users.id            FROM mra_vbc_opps.users           WHERE ((users.email)::text = mra_vbc_opps.current_user_email()))))) OR ((( SELECT users.role    FROM mra_vbc_opps.users   WHERE ((users.email)::text = mra_vbc_opps.current_user_email())))::text = 'Admin'::text))` |

### `dispositions`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `coder_insert_disposition_policy` | INSERT | public | PERMISSIVE | — | `((( SELECT users.role    FROM mra_vbc_opps.users   WHERE ((users.email)::text = mra_vbc_opps.current_user_email())))::text = ANY ((ARRAY['Coder'::character varying, 'Admin'::character varying])::text[]))` |

