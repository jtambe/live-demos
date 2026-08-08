# Live Demos

A collection of interactive demos and tools built with modern web technologies.

## Projects

### [Claims Anomaly Detection MVP](projects/claims-anomaly/README.md)

Full-stack application for detecting financial inconsistencies in insurance claims data using 14 detection rules. Built with Next.js, FastAPI, and PostgreSQL.

**Live Demo:** https://live-demos-prod.vercel.app/projects/claims-anomaly/anomalies-grouped  
**Documentation:** See [projects/claims-anomaly/README.md](projects/claims-anomaly/README.md)

---

## Tech Stack

- **Frontend:** Next.js 14 (TypeScript, React)
- **Backend:** FastAPI with background task processing
- **Database:** PostgreSQL (Supabase)
- **Hosting:** Vercel (serverless)
- **CLI:** Bash scripts with Python backends

## Project Structure

```
live-demos/
├── app/                              # Next.js frontend
│   ├── app/                          # App Router pages
│   │   ├── projects/claims-anomaly/  # Claims-anomaly project pages
│   │   └── page.tsx                  # Root page
│   ├── components/                   # Shared React components
│   ├── hooks/                        # Shared React hooks
│   └── package.json
├── api/                              # FastAPI backend
│   ├── main.py                       # FastAPI entry point
│   ├── routers/                      # API route handlers
│   ├── services/                     # Business logic
│   │   └── claims_anomaly_services/  # Claims-specific services
│   ├── utils/                        # Shared utilities
│   ├── requirements.txt              # Python dependencies
│   └── pyproject.toml                # Python project config
├── data/                             # Sample data and outputs
│   └── claims-anomaly/               # Claims-anomaly sample data
├── projects/                         # Project-specific files
│   └── claims-anomaly/               # Claims-anomaly project
│       ├── README.md                 # Project documentation
│       ├── ANOMALY_RULES.md          # Detailed rules
│       └── detect.sh                 # CLI tool
├── vercel.json                       # Vercel configuration
├── package.json                      # Root npm config
├── requirements.txt                  # Python dependencies
└── README.md                         # This file
```

## Local Development Setup

### Prerequisites

- Node.js 18+ (for Next.js)
- Python 3.12+ (for FastAPI)
- PostgreSQL (or Supabase account)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jtambe/live-demos.git
   cd live-demos
   ```

2. **Install frontend dependencies:**
   ```bash
   cd app
   npm install
   cd ..
   ```

3. **Set up Python environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   # Frontend
   cp app/.env.example app/.env.local
   # Update with your Supabase credentials
   
   # Backend
   cp .env.example .env
   # Update with your Supabase credentials
   ```

## Running Locally

### Option 1: Full Stack with Vercel Dev (Recommended)

```bash
npx vercel dev
```

This runs both frontend and backend together:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

### Option 2: Separate Services

**Terminal 1 - Frontend:**
```bash
cd app
npm run dev
```

**Terminal 2 - Backend:**
```bash
source venv/bin/activate
python -m uvicorn api.main:app --reload --port 8000
```

### Option 3: Frontend Only

```bash
cd app
npm run dev
```

(Requires backend running separately)

### Option 4: Backend Only

```bash
source venv/bin/activate
python -m uvicorn api.main:app --reload --port 8000
```

Test with: `curl http://localhost:8000/health`

---

## Project-Specific Documentation

Each project has its own README with detailed information:

- **[Claims Anomaly Detection](projects/claims-anomaly/README.md)** - Rules, CLI tool, database schema, testing guide

---

## Environment Variables

### Frontend (app/.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=/api
```

### Backend (.env at repo root)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Building for Production

### Frontend Build
```bash
cd app
npm run build
npm run start
```

### Vercel Deployment
```bash
git push origin main
# Vercel auto-deploys via GitHub integration
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
5. Create a pull request to `main`

---

## Deployment

The project is configured for Vercel deployment:

- Both frontend and backend deploy from a single Vercel project
- Configuration in `vercel.json` defines services
- Auto-deploys on push to `main`

**Live Demo:** https://live-demos-prod.vercel.app

---

## Troubleshooting

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Frontend can't reach backend
- Verify backend is running: `curl http://localhost:8000/health`
- Check `NEXT_PUBLIC_API_URL` in `app/.env.local`
- On Vercel, verify routing in `vercel.json`

### Python dependencies not installing
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Supabase connection issues
- Verify credentials in environment variables
- Check Supabase project is active
- Ensure IP is whitelisted (or use public mode for development)

---

## License

MIT

---

## Support

For project-specific issues, see the project's README in `projects/<project-name>/`

For general questions, open a GitHub issue.
