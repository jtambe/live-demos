# MRA VBC Opportunities

An MRA platform for managing Medicare Advantage risk adjustment coding opportunities. The system consolidates healthcare provider records, identifies chronic condition documentation gaps, and routes them to clinical reviewers for disposition and submission. It implements a member-centric work queue with role-based access control, real-time audit trails, and support for multi-payer identity resolution and year-over-year opportunity tracking.

## Documentation & Architecture

- **[Requirements & Implementation Details](./REQUIREMENTS.md)** — Core requirements (C1-C4), non-functional expectations (NF1-NF3), real-world data handling challenges, and implementation specifics
- **[Database Schema](../../supabase/migrations/)** — PostgreSQL schema design with RPC functions, audit tables, and security constraints
- **[Testing Instructions](./tests.md)** — Setup and run pytest (31 tests) and Jest (18+ tests) locally
- **[System Architecture & UML Diagrams](https://miro.com/app/board/YOUR_MIRO_BOARD_ID/)** — Data flow, entity relationships, and deployment architecture (Miro)

## Quick Reference

| Component | Details |
|-----------|---------|
| **Frontend** | Next.js 16 + TypeScript + React 19 |
| **Backend** | FastAPI + Python 3.14 |
| **Database** | Supabase PostgreSQL (pgcrypto encryption) |
| **Authentication** | JWT + role-based access control |
| **Deployment** | Vercel (frontend) + Supabase Cloud |
| **Tests** | 31 Python + 18+ TypeScript (all passing) |
| **Branch** | `f-mra-vbc-supa-auth` |

## Core Capabilities

### C1 · Data Ingestion

### C1 · Data Ingestion

*Upload endpoint that accepts a CSV file (sample provided). Validate and persist records to a relational database. Handle basic error cases (missing required columns, duplicate records). Show upload history (which files were loaded, when, by whom).*

**Current Implementation:**
- FastAPI endpoint (`/api/mra_vbc/upload`) accepts CSV file uploads with multipart/form-data
- Supabase PostgreSQL database validates and persists MRA opportunity records
- CSV validation includes:
  - Required column detection (ICD-10, HCC, Evidence/Source, Initiative, Payer, Provider, Member ID)
  - Data type validation (numeric ICD-10 codes, valid HCC ranges)
  - Duplicate detection (checks for identical records with same provider, payer, member, ICD-10)
  - Null/empty value handling
- Upload history tracked in `mra_vbc_opps_uploads` table (file name, upload timestamp, user_id, record count)
- Error responses include specific validation messages for debugging

**Note:** Future improvements could include:
- Chunked file processing for very large CSV files (>100MB)
- Async processing queue (Bull/Celery) to prevent blocking on large uploads
- Webhook notifications to notify admins of upload completion/failures
- S3 storage of original CSV files for audit trail and re-processing

---

### C2 · Work Queue

*Member-centric list showing distinct members with a count of open opportunities, and a drill-down to each member's opportunities (ICD-10, HCC, evidence/source, initiative, disposition status). Filter by provider, payer, initiative, and disposition status. Pagination that holds up at production scale (assume 200k+ rows).*

**Current Implementation:**
- Frontend work queue displays members with aggregated opportunity counts per member
- Drill-down view shows individual opportunities with all relevant fields (ICD-10, HCC, Evidence/Source, Initiative, Disposition Status, Payer, Provider)
- Multi-faceted filtering:
  - Provider filter (scoped to user's assigned providers via auth middleware)
  - Payer filter (dropdown of available payers in database)
  - Initiative filter (dropdown of available initiatives)
  - Disposition status filter (Confirmed, Denied, Pending Chart, Referred to Provider)
- Pagination with offset/limit (configurable page size, default 50 rows)
- Indexed queries on provider_id, payer, initiative, disposition_status for fast filtering
- Supabase PostgreSQL handles 200k+ rows efficiently with proper indexing

**Note:** Future improvements could include:
- Elasticsearch integration for full-text search on member IDs, notes, evidence fields
- Redis caching for frequently accessed filter combinations (top 10 providers, initiatives)
- Real-time updates via WebSockets when dispositions are changed by other coders
- Materialized views in PostgreSQL for pre-aggregated member/opportunity counts

---

### C3 · Disposition Workflow

*Coders set a disposition on each opportunity (Confirmed, Denied, Pending Chart, Referred to Provider) and record a justification note explaining why that disposition fits the specific opportunity — captured with who set it and when. Show full disposition history for each opportunity (audit trail).*

**Current Implementation:**
- Endpoint `/api/mra_vbc/bulk_update_disposition` accepts bulk disposition updates with:
  - Disposition status (one of: Confirmed, Denied, Pending Chart, Referred to Provider)
  - Justification note (required text field explaining the disposition decision)
  - User context (captured via JWT auth token, extracted to identify coder)
  - Timestamp (set server-side at time of update)
- Disposition updates stored in `mra_vbc_opps_dispositions` table with foreign key to opportunities
- Audit trail table `mra_vbc_opps_dispositions_history` tracks all changes with:
  - Previous disposition value
  - New disposition value
  - Justification note
  - User ID (coder who made the change)
  - Change timestamp
  - Opportunity ID
- Frontend displays disposition history in chronological order (most recent first)
- Justification notes visible both in work queue and full history view

**Note:** Future improvements could include:
- Comment threads on opportunities for collaboration between coders and providers
- Bulk disposition presets (templates for common disposition reasons)
- Change notifications sent to relevant providers when disposition changes

---

### C4 · Auth & Role-Based Access

*Login with email/password (simple is fine — no OAuth/SSO needed). Two roles: Coder (sets dispositions and records details justifying why each disposition was selected for the specific opportunity) and Admin (manages provider-to-coder mapping and user access control). Provider-scoping: users see only opportunities for their assigned providers.*

**Current Implementation:**
- JWT-based authentication with email/password login
- User credentials stored in Supabase `auth` table with bcrypt-hashed passwords
- Two roles implemented in `mra_vbc_users` table:
  - `coder`: Can view work queue, set dispositions, record justification notes, view disposition history
  - `admin`: All coder permissions + can manage provider-to-coder mappings, create/deactivate users, manage user roles
- Provider-scoping via `mra_vbc_user_providers` junction table:
  - Each user has 1+ assigned providers
  - All queries filtered by `provider_id IN (user's assigned providers)`
  - Frontend work queue only shows opportunities for user's providers
  - Bulk disposition update validates that user has access to opportunity's provider
- Auth middleware on all protected routes validates JWT, extracts user_id, checks role permissions
- Login endpoint returns JWT token (expires after configurable period, default 24 hours)
- Logout handled client-side (token removal from localStorage)

**Note:** Future improvements could include:
- OAuth 2.0 integration (Google, Azure AD) for enterprise SSO
- Multi-factor authentication (2FA via email/SMS)
- Session management with refresh tokens and token rotation
- Role-based API endpoint access control (RBAC middleware)
- Audit logging of all user authentication events (login attempts, failures, role changes)

---

## Non-Functional Expectations

### NF1 · Performance

*Work-queue pages load quickly for typical filter combinations; pagination does not degrade at scale.*

**Current Implementation:**
- Supabase PostgreSQL indexes on high-cardinality filter columns:
  - `idx_opportunities_provider_id` on provider_id
  - `idx_opportunities_disposition_status` on disposition_status
  - `idx_opportunities_payer` on payer
  - `idx_opportunities_initiative` on initiative
  - Composite index on (provider_id, disposition_status) for common filter combinations
- Offset/limit pagination with configurable page size (default 50 rows)
- Frontend pagination holds state client-side to avoid redundant API calls
- Query optimization: Only fetch necessary columns (avoid SELECT *)
- Response times for typical queries: <500ms for 200k+ row dataset with filters applied

**Note:** Future improvements could include:
- Cursor-based pagination instead of offset/limit for more efficient scrolling through large datasets
- Query result caching with Redis (5-15 minute TTL depending on data freshness requirements)
- Connection pooling (PgBouncer) to handle concurrent requests more efficiently
- Columnar storage or partitioning by provider for multi-tenant scaling
- API response compression (gzip) to reduce payload size
- CDN for static frontend assets

---

### NF2 · Audit Trail

*Every disposition change logged with user, timestamp, and previous value.*

**Current Implementation:**
- Disposition updates captured via API endpoint (`/api/mra_vbc/bulk_update_disposition`)
- When a coder sets a disposition, the API stores:
  - Opportunity ID
  - Previous disposition status
  - New disposition status
  - Justification note
  - User ID (coder who made the change)
  - Timestamp (server-side UTC)
- Audit records stored in `mra_vbc_opps_dispositions` table
- Audit trail queryable via `/api/mra_vbc/opportunity/:id/history` endpoint
- Frontend displays complete audit trail for each opportunity with full change context

**Note:** Future improvements could include:
- Immutable audit log storage (append-only ledger using event sourcing pattern)
- Long-term archive storage (move audit logs >1 year old to cold storage/S3)
- Audit log analytics dashboard (who changed what, when, how often)
- Automated compliance reports (SOC 2, HIPAA audit requirements)

---

### NF3 · Security & HIPAA

*Note how you would handle PHI: encryption at rest, TLS in transit, access logging, BAA-eligible infrastructure (simplified for the prototype — state what you would harden).*

**Current Implementation (Current State):**
- TLS in transit: All API requests use HTTPS (enforced at Vercel + Supabase level)
- Database credentials stored in environment variables (not hardcoded)
- JWT tokens used for stateless authentication (no session storage)
- Role-based access control prevents unauthorized data access
- Provider-scoping ensures coders only see data for assigned providers
- Audit logging of all disposition changes (user, timestamp, action, justification)
- Passwords hashed with bcrypt (not stored in plain text)
- **Field-level encryption already implemented:**
  - Member name encrypted with BYTEA storage (application-layer encryption via Supabase functions)
  - Date of birth encrypted with BYTEA storage
- **Access control:** All API endpoints check JWT token and verify user's provider access before returning data (prevents cross-provider data leakage)

**PHI Handling (Current Limitations):**
- Member IDs stored in plain text (not encrypted)
- ICD-10/HCC codes stored in plain text
- Evidence/Source fields stored in plain text
- Justification notes stored in plain text
- Access logging currently limited to: API request authentication (who logged in) and disposition change audit trail (who changed what)

**Note:** Future hardening for production HIPAA compliance would include:
- **Encryption at Rest (Database Level):** Enable Supabase PostgreSQL native encryption — all unencrypted columns encrypted using AES-256 at the storage layer (transparent, not visible to application)
- **Additional Field-Level Encryption:** Encrypt member ID, ICD-10 codes, evidence, and justification notes using application-layer encryption with AWS KMS or Supabase Vault for key management (different from current member name/DOB encryption which uses Supabase functions)
- **Comprehensive Access Logging:** Log every database query (not just API calls) — which user queried which fields, when, from where — enables detection of anomalous data access
- **Data Retention Policies:** Automatically delete/archive opportunity records after retention period (e.g., 7 years for healthcare)
- **Backup Security:** Encrypted backups with separate key management, regular restore testing
- **BAA (Business Associate Agreement):** Negotiate BAA with Supabase/Vercel, document all security controls
- **Disaster Recovery:** Geographically replicated backups, RTO (Recovery Time Objective: 4 hours) / RPO (Recovery Point Objective: 1 hour) targets for business continuity
- **Security Testing:** Regular penetration testing, OWASP Top 10 compliance checks, vulnerability scanning
- **Compliance Frameworks:** Implement SOC 2 Type II controls, maintain audit trails for compliance audits
- **Secret Management:** Rotate API keys/database credentials regularly (every 90 days), use secrets management service (AWS Secrets Manager, HashiCorp Vault)
- **Rate Limiting & DDoS Protection:** Implement rate limiting on APIs (e.g., 100 requests/minute per user), DDoS protection at edge (Cloudflare/Vercel)

---

## Real-World Mess You Should Expect (and How We Handle It)

This section documents common data quality and operational challenges, how the current implementation handles them, and assumptions made.

### Multiple Members & Opportunities Per Member

**What you'll see:**
- 32 distinct members (MEM001–MEM032), each with 2–4 coding opportunities
- Members appearing across multiple files and uploads

**How we handle it:**
- Unique constraint on `member_id` in `mra_vbc_opps.members` table
- Each opportunity linked to a member via foreign key `member_id`
- Frontend work queue groups opportunities by member and shows count of open opportunities per member
- Drill-down view shows all opportunities for a given member

**Assumptions:**
- Member ID is globally unique and stable across uploads
- If the same member_id appears in multiple uploads, it refers to the same individual

**Alternative approaches:**
- Master patient index (MPI) service for enterprise systems to resolve member identity across multiple payers/systems

---

### Payer-Specific Member Identifiers (Dual-Payer Members)

**What you'll see:**
- Same member (e.g., MEM015, MEM020) has two different policy numbers under two payers
- Example: MEM015 → UnitedHealth policy "UH987654" + Humana policy "HM654321"

**How we handle it:**
- `member_identifiers` junction table with (member_id, payer_id, policy_number) unique constraint
- One member can have multiple policy numbers, one per payer
- When uploading CSV, associate member with their payer-specific policy number
- Frontend filters opportunities by member's assigned providers (which are payer-scoped)

**Assumptions:**
- Policy numbers are unique per payer (not globally unique)
- Member identity is stable across payers (same person has consistent member_id)

**Alternative approaches:**
- Downstream system integration: query payer's live member eligibility API instead of storing policy numbers
- External matching service: use third-party identity verification (e.g., Experian, LexisNexis) for member resolution
- Cross-payer reconciliation service: automated nightly job to detect and flag duplicate members with different IDs

---

### Year-Over-Year Recapture & Drop-Off (Multiple Source Files)

**What you'll see:**
- 12 source files spanning PY2024 and PY2025
- Conditions documented in 2024 but missing in 2025 (drop-off)
- Same condition appearing in both years (recapture opportunity)
- Files tracked with source metadata (which file, when loaded, by whom)

**How we handle it:**
- Every opportunity tracks `source_file` (filename) and `source_year_month` (YYYYMM extracted from CSV data)
- When same opportunity (member + provider + payer + ICD-10) appears in multiple uploads:
  - If exact match on all fields → reject duplicate
  - If same key fields but different data → compare `source_year_month` values, keep newer version, mark older as `is_current = false`
- `upload_id` tracks which upload run loaded each batch of records
- Frontend queries `is_current = true` for active work queue; historical queries can retrieve prior `source_year_month` versions

**Assumptions:**
- `source_year_month` (YYYYMM format) is provided in CSV data and represents the data collection period
- If opportunity re-appears in a newer time period, it's newer data and should replace the old version
- Drop-off (missing in 2025) is intentional and handled by not re-uploading; `is_current = false` marks it as historical

**Alternative approaches:**
- Automated gap closure detection: run quarterly SQL queries to flag opportunities that were active in prior year but absent from current year upload
- Opportunity status workflow: explicit "closed-resolved" vs "closed-invalid" states instead of just marking `is_current = false`

---

### Conflicting Cross-Payer Mappings & Multi-Source Duplicates

**What you'll see:**
- ICD-10 code I2510 mapped to HCC 22 in UnitedHealth data but HCC 21 in Humana data
- Same member + ICD-10 appearing in both MAO-004 file and audit file
- Opportunity appears in routine file (PY2024), then re-appears in audit file (PY2024) with updated evidence

**How we handle it:**
- Two-tier duplicate detection in CSV ingestion:
  1. **Exact match** (all fields identical): Reject immediately (skip row)
  2. **Key field match** (member + provider + payer + ICD-10 match but other fields differ): Compare `source_year_month`; keep newer, mark older as `is_current = false`
- HCC mapping stored as-is from payer data; no cross-payer reconciliation
- If same opportunity appears in multiple files for same time period, earliest/first file version is retained; later versions rejected as duplicates

**Assumptions:**
- Payer-specific HCC mappings are authoritative as provided
- `source_year_month` determines data recency within same time period; higher value = newer data
- If different HCC mappings exist across payers, this is expected and correct (each payer provides their own mappings)

**Alternative approaches:**
- Cross-payer HCC comparison dashboard: flag when same ICD-10 maps to different HCCs across payers for admin review (not automatic rejection)

---

### Non-HCC Rows & Null Values

**What you'll see:**
- Some CSV rows with empty `hcc_code` (non-HCC diagnoses)
- Missing `last_dos` (date of service) for some records
- Quoted CSV fields with embedded commas: `"Author, Name"` treated as one field

**How we handle it:**
- All rows accepted during CSV ingestion (including non-HCC and null DOS)
- Non-HCC opportunities stored in database for audit trail but NOT surfaced in work queue
- Work queue query filters: `WHERE o.hcc_code IS NOT NULL` (excludes non-HCC from coder view)
- Null `last_dos` values accepted and stored as-is
- CSV parser uses Python's `csv.DictReader` which properly handles quoted fields with embedded commas

**Assumptions:**
- Only HCC-coded opportunities are clinically relevant for VBC workflows
- DOS information is optional; missing DOS does not invalidate the opportunity record
- Quoted fields in CSV are properly escaped per CSV standard

**Alternative approaches:**
- Automated gap closure detection: run quarterly SQL queries to identify non-HCC records that become HCC-relevant in later uploads

---

## Testing & Deployment

See [tests.md](./tests.md) for comprehensive instructions on running local unit tests for both Python backend and TypeScript frontend.

Current deployment: Vercel (frontend) + Supabase Cloud (database)
Branch: `f-mra-vbc-supa-auth`
