# Live Demos - Claims Anomaly Detection MVP

A full-stack claims anomaly detection system built with Next.js, FastAPI, and PostgreSQL. Detects financial inconsistencies and impossibilities in insurance claims data using 14 detection rules.

**Live Demo:** https://live-demos-prod.vercel.app/projects/claims-anomaly/anomalies-grouped

## Tech Stack

- **Frontend:** Next.js 14 (TypeScript, React)
- **Backend:** FastAPI with background task processing
- **Database:** PostgreSQL (Supabase)
- **Hosting:** Vercel (serverless)

## Project Structure

```
live-demos/
├── app/                          # Next.js frontend
│   ├── app/                      # App Router pages
│   │   ├── projects/claims-anomaly/
│   │   │   ├── upload/           # CSV upload page
│   │   │   ├── claims/           # View claims page
│   │   │   ├── anomalies/        # View anomalies page
│   │   │   ├── anomalies-grouped/# Grouped anomalies page
│   │   │   └── rules/            # Rules reference page
│   │   └── page.tsx              # Root page
│   ├── components/               # React components
│   └── package.json
├── api/                          # FastAPI backend
│   ├── main.py                   # FastAPI app entry point
│   ├── routers/                  # API route handlers
│   ├── services/                 # Business logic
│   │   ├── anomaly_rules.py      # 14 detection rules
│   │   └── anomaly_export.py     # CSV export for detect.sh
│   ├── utils/                    # Utility functions
│   ├── requirements.txt          # Python dependencies
│   └── pyproject.toml            # Python project config
├── detect.sh                     # CLI tool for batch anomaly detection
├── vercel.json                   # Vercel services configuration
└── README.md
```

## Local Development

### Prerequisites

- Node.js 18+ (for Next.js)
- Python 3.12+ (for FastAPI)
- PostgreSQL (or Supabase account)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jtambe/live-demos.git
   cd live-demos
   ```

2. **Install dependencies:**
   ```bash
   # Frontend
   cd app && npm install && cd ..
   
   # Backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment variables:**
   ```bash
   cp app/.env.example app/.env.local
   # Update with your Supabase credentials
   ```

---

## Running Locally

### Option 1: Vercel Dev (Full Stack - Recommended)

Run both Next.js and FastAPI together using Vercel's dev environment:

```bash
npm install -g vercel

cd /path/to/live-demos
npx vercel dev
```

**What happens:**
- Frontend runs on `http://localhost:3000` (or next available port)
- Backend API runs on `http://localhost:3001` (or next available port)
- Vercel handles routing and service orchestration

**Stop:** Press `Ctrl+C`

---

### Option 2: Next.js Only

Run just the frontend:

```bash
cd app
npm run dev
```

**Output:** Frontend on `http://localhost:3000`

**Note:** You'll need the backend running separately (Option 3) to use upload/detection features.

---

### Option 3: FastAPI Only

Run just the backend:

```bash
source venv/bin/activate  # Activate Python venv
cd /path/to/live-demos
python -m uvicorn api.main:app --reload --port 8000
```

**Output:** API on `http://localhost:8000`

**Test:** Visit `http://localhost:8000/health` to verify it's running

---

### Option 4: Run Both Separately (Full Stack)

In **Terminal 1** (Next.js):
```bash
cd app && npm run dev
```

In **Terminal 2** (FastAPI):
```bash
source venv/bin/activate
python -m uvicorn api.main:app --reload --port 8000
```

**Then:** 
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

---

## CLI Tool: detect.sh

Run anomaly detection on claims CSV files from the command line:

### Usage

```bash
# Output anomalies to stdout (CSV format)
./detect.sh path/to/claims.csv

# Save to file
./detect.sh path/to/claims.csv anomalies.csv

# Example with sample data
./detect.sh data/claims-anomaly/claims_monthly.csv
```

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

1. **Negative Values** - Any numeric field with negative values
2. **Medical Service Lines < Medical Claims** - Impossible relationship
3. **RX Service Lines < RX Claims** - Impossible relationship
4. **Medical Incentive > Medical Plan Pay** - Overpayment scenario
5. **RX Incentive > RX Plan Pay** - Overpayment scenario
6a. **Medical Claims Without Payment** - Orphaned claims
6b. **RX Claims Without Payment** - Orphaned claims
7a. **Medical Lines Without Claims** - Orphaned lines
7b. **RX Lines Without Claims** - Orphaned lines
8. **Activity Without Members** - Impossible scenario
10. **Claims Per Member Too High** - Utilization spike (>50 per member)
11. **Service Lines Per Claim Too High** - Complexity spike (>50 per claim)
12. **RX/Medical Ratio Extreme** - Imbalanced distribution (>10x or <0.1x)
13. **Missing Critical Fields** - Data quality issue

See `/projects/claims-anomaly/rules` in the web app for detailed explanations.

---

## Database Setup

### Supabase PostgreSQL

The project uses Supabase for PostgreSQL hosting. Key tables:

- `claims` - Claims data from uploaded CSV files
- `anomalies` - Detected anomalies with rules violated
- `client_month_reviews` - Review status and feedback per (client_id, service_month)

### Migrations

Migrations are in `api/migrations/`. Apply them via Supabase dashboard or CLI:

```bash
# Using Supabase CLI
supabase migration up
```

---

## Building for Production

### Frontend Build

```bash
cd app
npm run build
npm run start
```

### Docker

Use `vercel.json` configuration for Vercel deployment:

```bash
git push origin main
# Vercel auto-deploys on push
```

---

## Environment Variables

### Frontend (app/.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key
NEXT_PUBLIC_API_URL=/api
```

### Backend (root/.env)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
```

---

## Testing

### Frontend Tests

```bash
cd app
npm test
```

### Backend Tests

```bash
source venv/bin/activate
pytest
```

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit: `git commit -m "Description"`
4. Push: `git push origin feature/your-feature`
5. Create a pull request

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Supabase Connection Issues

- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys in `.env.local`
- Check Supabase project is active
- Ensure IP is whitelisted (or use public mode for development)

### API Not Responding

- Check FastAPI is running: `curl http://localhost:8000/health`
- Verify `NEXT_PUBLIC_API_URL` points to correct backend
- Check Python venv is activated

---

## License

MIT

---

## Support

For questions or issues, reach out via GitHub Issues.
