# Claims Anomaly Detection MVP

A full-stack claims anomaly detection system built with Next.js, FastAPI, and PostgreSQL. Detects financial inconsistencies and impossibilities in insurance claims data using 14 detection rules.

**Live Demo:** https://live-demos-prod.vercel.app/projects/claims-anomaly/anomalies-grouped

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL (or Supabase account)

### Local Development

**Option 1: Full Stack (Recommended)**
```bash
cd /path/to/live-demos
npx vercel dev
```

**Option 2: Separate Terminals**

Terminal 1 (Frontend):
```bash
cd app && npm run dev
```

Terminal 2 (Backend):
```bash
python -m uvicorn api.main:app --reload --port 8000
```

Then open `http://localhost:3000`

---

## CLI Tool: detect.sh

Run anomaly detection on claims CSV files from the command line. Results are automatically saved to `../../data/claims-anomaly/anomalies.csv`.

### Usage

```bash
cd projects/claims-anomaly

# Run with sample data
./detect.sh ../../data/claims-anomaly/claims_monthly.csv

# Run with custom file
./detect.sh /path/to/your/claims.csv
```

**Output:** Results automatically saved to `../../data/claims-anomaly/anomalies.csv`

### Output Format

CSV with columns:
- `client_name` - Client identifier
- `service_month` - Month (YYYY-MM-DD format)
- `affected_metrics` - Comma-separated column names with anomalies
- `confidence` - Detection confidence (high, medium, low)
- `notes` - Explanation of the anomaly

---

## Anomaly Detection Rules

14 rules detect financial inconsistencies and logical impossibilities:

### Hard Rules (1-8, 10-13)

1. **Negative Values** - Any numeric field with negative values
   - Financial and count data cannot be negative. Detects when any numeric field (payments, claims, service lines) contains negative values indicating data entry errors or system bugs.

2. **Medical Service Lines < Medical Claims** - Impossible relationship
   - Medical service lines cannot be fewer than medical claims. A claim must have at least one service line. Indicates data inconsistency or orphaned records.

3. **RX Service Lines < RX Claims** - Impossible relationship
   - RX service lines cannot be fewer than RX claims. Each claim requires at least one service line. Suggests data integrity issues.

4. **Medical Incentive > Medical Plan Pay** - Overpayment scenario
   - Incentive payments cannot exceed the plan's actual payment. Indicates overpayment or accounting errors.

5. **RX Incentive > RX Plan Pay** - Overpayment scenario
   - Same as rule 4 but for pharmacy claims. Suggests potential financial misappropriation.

6a. **Medical Claims Without Payment** - Orphaned claims
   - Medical claims exist but no corresponding payment was made. Indicates unpaid or lost claims.

6b. **RX Claims Without Payment** - Orphaned claims
   - RX claims exist but no corresponding payment. Similar to 6a but for pharmacy.

7a. **Medical Lines Without Claims** - Orphaned lines
   - Service lines exist but no parent claims. Indicates data structure violation.

7b. **RX Lines Without Claims** - Orphaned lines
   - RX service lines without parent claims. Similar data integrity issue.

8. **Activity Without Members** - Impossible scenario
   - Claims, service lines, or payments exist for a client with zero or null members. Physically impossible scenario.

10. **Claims Per Member Too High** - Utilization spike
   - More than 50 medical claims per member (threshold: 50). Indicates unusually high utilization.

11. **Service Lines Per Claim Too High** - Complexity spike
   - More than 50 service lines per medical claim (threshold: 50). Indicates unusual claim complexity.

12. **RX/Medical Ratio Extreme** - Imbalanced distribution
   - RX claims are >10x or <0.1x the medical claims. Suggests unusual pharmacy utilization pattern.

13. **Missing Critical Fields** - Data quality issue
   - Missing required fields: client_id, client_name, service_month, count_eligible_primary_members, total_plan_pay_medical, total_plan_pay_rx.

---

## Project Structure

```
claims-anomaly/
├── README.md               # This file
├── ANOMALY_RULES.md       # Detailed rules documentation
├── detect.sh              # CLI tool for batch anomaly detection
├── app/                   # Frontend (Next.js)
├── api/                   # Backend (FastAPI)
└── data/                  # Sample data and outputs
```

---

## Database Schema

The project uses Supabase PostgreSQL with the following tables in the `claims_anomaly` schema:

### claims_monthly
Stores uploaded claims data
```sql
client_id, client_name, service_month,
count_eligible_primary_members,
num_unique_claims_medical, num_unique_claims_rx,
num_service_lines_medical, num_service_lines_rx,
total_plan_pay_medical, total_plan_pay_rx,
total_garner_incentive_paid_medical, total_garner_incentive_paid_rx
```

### anomalies
Detected anomalies with status tracking
```sql
client_id, client_name, service_month,
rule_violated, affected_metrics, confidence,
notes, status, first_seen_at, last_seen_at, recurrence_count
```

### client_month_reviews
Review status and feedback per (client_id, service_month)
```sql
client_id, service_month, status, feedback, reviewed_at
```

### analysis_runs
Metadata about each analysis run
```sql
file_hash, file_path, original_filename,
data_period_start, data_period_end,
row_count, anomalies_found, upload_date
```

---

## Environment Variables

### Frontend (app/.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
NEXT_PUBLIC_API_URL=/api
```

### Backend (.env at repo root)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
```

---

## Pages

- **Upload** (`/projects/claims-anomaly/upload`) - Upload claims CSV
- **View Claims** (`/projects/claims-anomaly/claims`) - Browse claims data with filters
- **View Anomalies** (`/projects/claims-anomaly/anomalies-grouped`) - Review detected anomalies
- **Rules** (`/projects/claims-anomaly/rules`) - Reference for all detection rules

---

## Testing the Full Flow

1. Visit `/projects/claims-anomaly/upload`
2. Download sample from `data/claims-anomaly/claims_monthly.csv` or use your own
3. Upload the CSV
4. Go to `/projects/claims-anomaly/claims` to view imported data
5. Click "Analyze All for Anomalies" to run detection
6. View results at `/projects/claims-anomaly/anomalies-grouped`
7. Review anomalies and provide feedback per (client_id, service_month) group
8. Use bulk selection to review multiple groups at once

---

## Troubleshooting

### Backend not responding
```bash
# Check if FastAPI is running
curl http://localhost:8000/health

# Expected response:
# {"status":"ok","service":"claims-anomaly"}
```

### Upload fails
- Verify CSV has all required columns (see Database Schema above)
- Check file size (max: typically 50MB on Vercel)
- Ensure service_month is in YYYY-MM-DD format

### Anomalies not appearing
- Give backend 10-30 seconds to analyze (background task)
- Refresh the page
- Check browser console for API errors
- Verify Supabase credentials in environment variables

### detect.sh not found
```bash
# Make sure you're in the right directory
cd projects/claims-anomaly

# Check if script is executable
chmod +x detect.sh

# Try again
./detect.sh ../../data/claims-anomaly/claims_monthly.csv
```

---

## Key Features

✅ Upload claims CSV files  
✅ Automatic anomaly detection with 14 rules  
✅ Review anomalies grouped by client + month  
✅ Bulk selection and bulk review  
✅ Optimistic UI updates (no refetch on review)  
✅ CLI tool for batch analysis  
✅ Sample data included  

---

## Development Notes

- Frontend components are in `app/app/projects/claims-anomaly/components/`
- Shared components are in `app/components/` (Pagination, VercelBadge)
- Backend services are in `api/services/claims_anomaly_services/`
- Rules implementation: `api/services/claims_anomaly_services/anomaly_rules.py`
- CSV parsing: `api/services/claims_anomaly_services/csv_parser.py`
- Database ops: `api/services/claims_anomaly_services/supabase_ops.py`

---

## Support

For issues specific to this project, check:
1. [ANOMALY_RULES.md](ANOMALY_RULES.md) for detailed rule explanations
2. Live demo at https://live-demos-prod.vercel.app/
3. Project issues on GitHub
