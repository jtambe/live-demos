# Project Setup Guide

This document provides instructions for setting up and running the Live Demos project locally.

## Prerequisites

- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- Supabase project with credentials
- Git

## Environment Variables

Create `app/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note:** Variables starting with `NEXT_PUBLIC_` are exposed to browser. Never expose secret keys.

## Running Locally (Recommended)

**Run both frontend + backend together:**
```bash
npx vercel dev
```

- Frontend: `http://localhost:3000`
- Backend: automatic (Service Binding connects to it)
- API: accessible via `/api/...` paths

## Alternative: Separate Services

**Terminal 1 - Frontend:**
```bash
cd app && npm install && npm run dev
```

**Terminal 2 - Backend:**
```bash
# Install dependencies (uv + pyproject.toml)
uv pip install -e .

# Or use pip
pip install -e .

# Run
python -m uvicorn api.main:app --reload --port 8000
```

Test backend: `curl http://localhost:8000/api/health`

## Project Structure

```
live-demos/
├── app/                                    # Next.js 16 frontend
│   ├── app/
│   │   ├── page.tsx                       # Landing page
│   │   ├── layout.tsx                     # Root layout
│   │   └── projects/claims-anomaly/       # Project-specific pages
│   │       ├── components/                # Project components
│   │       ├── anomalies-grouped/page.tsx
│   │       ├── claims/page.tsx
│   │       ├── upload/page.tsx
│   │       └── rules/page.tsx
│   ├── components/                        # Shared components
│   ├── hooks/                             # Shared hooks
│   ├── utils/                             # Utilities (api.ts)
│   └── package.json
│
├── api/                                   # FastAPI backend
│   ├── main.py                            # Entry point
│   ├── routers/
│   │   └── claims_anomaly.py              # Endpoints
│   ├── services/
│   │   └── claims_anomaly_services/       # Business logic
│   │       ├── anomaly_rules.py
│   │       ├── anomaly_analyzer.py
│   │       ├── supabase_ops.py
│   │       ├── csv_parser.py
│   │       └── anomaly_export.py
│   └── utils/
│
├── data/claims-anomaly/                   # Sample data
├── projects/claims-anomaly/               # Project files
│   ├── README.md
│   ├── ANOMALY_RULES.md
│   └── detect.sh                          # CLI tool
│
├── pyproject.toml                         # Python dependencies (uv)
├── vercel.json                            # Services + routing
├── SETUP.md                               # This file
└── README.md                              # Project overview
```

## Frontend Development

The landing page (`app/app/page.tsx`) displays:
- Project cards for all available demos
- Backend health status
- Links to individual project pages

To add a new project:
1. Add project metadata to the `projects` array in `page.tsx`
2. Create a new directory in `app/app/projects/[name]/`
3. Implement the project page

## Backend Development

**Structure:**
- `api/routers/` - Endpoint definitions (e.g., claims_anomaly.py)
- `api/services/claims_anomaly_services/` - Business logic
- `api/main.py` - FastAPI app + router registration

**Add new project:**
1. Create `api/routers/new_project.py` with APIRouter
2. Create `api/services/new_project_services/` for logic
3. Register in `main.py`: `app.include_router(router, prefix="/new-project")`
4. Accessible at `/api/new-project/*`

## Testing

**Backend health:**
```bash
curl http://localhost:8000/api/health
```

**Frontend:**
- Visit `http://localhost:3000`
- Landing page loads ✓
- Project cards visible ✓
- Backend status shows "connected" ✓
- Click Claims Anomaly project ✓

## Deployment

**Vercel (automatic on push to main):**
1. Link GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Frontend + Backend deploy together via `vercel.json` services config

**Routing:**
- Local: Service Binding injects backend URL
- Cloud: Rewrites route `/api/*` to backend service

## Troubleshooting

**Using `npx vercel dev`:**
- Backend runs on random port (handled by Service Binding automatically)
- Frontend can't reach backend directly (use `/api/...` paths)
- Check Vercel logs if API calls fail

**Using separate services:**
- Backend health: `curl http://localhost:8000/api/health`
- Restart backend: `python -m uvicorn api.main:app --reload --port 8000`

**Port conflicts:**
- Frontend: `npm run dev -- -p 3001`
- Backend: `python -m uvicorn api.main:app --reload --port 8001`

**Module not found:**
- Frontend: `cd app && npm install`
- Backend: `uv pip install -e .` or `pip install -e .`

## Next Steps

1. ✅ Set up landing page
2. ✅ Connect to FastAPI backend
3. ⬜ Create claims-anomaly project page
4. ⬜ Implement CSV data upload for claims-anomaly
5. ⬜ Build anomaly detection logic
6. ⬜ Deploy to Vercel
