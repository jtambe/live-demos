# Project Setup Guide

This document provides instructions for setting up and running the Live Demos project locally.

## Prerequisites

- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- Supabase project with credentials
- Git

## Environment Variables

Create a `.env.local` file in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Note:** Variables starting with `NEXT_PUBLIC_` are exposed to the browser. Never expose secret keys.

## Frontend Setup (Next.js)

```bash
cd app
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Backend Setup (FastAPI)

```bash
cd api
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

pip install -r requirements.txt
```

### Run the backend

```bash
python -m uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## Project Structure

```
live-demos/
├── app/                              # Next.js frontend
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css              # Global styles
│   │   └── projects/                # Project pages (to be added)
│   │       └── claims-anomaly/
│   ├── next.config.js               # Next.js configuration
│   ├── tsconfig.json                # TypeScript config
│   └── package.json
│
├── api/                              # FastAPI backend
│   ├── main.py                      # FastAPI app entry point
│   ├── config.py                    # Configuration management
│   ├── db.py                        # Supabase client initialization
│   ├── routers/
│   │   ├── __init__.py
│   │   └── claims_anomaly.py        # Claims anomaly endpoints
│   ├── requirements.txt             # Python dependencies
│   └── .gitignore
│
├── .env.example                      # Environment variables template
├── .gitignore
├── vercel.json                       # Vercel deployment config
├── SETUP.md                          # This file
└── README.md                         # Project overview
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

The FastAPI server includes:
- CORS middleware for frontend communication
- Health check endpoint
- Router structure for organizing project endpoints

To add a new project endpoint:
1. Create a new router in `api/routers/new_project.py`
2. Import and include the router in `main.py`
3. Access at `/api/new-project/*`

## Testing

### Test the backend

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/claims-anomaly/hello
```

### Test the frontend

Visit `http://localhost:3000` and check if:
- Landing page loads
- Project cards are visible
- Backend status shows connected (if backend is running)
- Clicking on Claims Anomaly project works

## Deployment

### Vercel Deployment

1. Create a Vercel project linked to your GitHub repository
2. Configure environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (point to your deployed FastAPI endpoint)
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Both frontend and backend deploy automatically on push to main

### Environment URLs

- **Development:** `http://localhost:3000` (frontend), `http://localhost:8000` (backend)
- **Production:** Will be set up on first Vercel deployment

## Troubleshooting

### Backend connection fails
- Ensure FastAPI is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

### Module not found errors
- Ensure you're in the correct directory (`app/` or `api/`)
- Run `npm install` in `app/` or `pip install -r requirements.txt` in `api/`

### Port already in use
- Frontend: Change port with `npm run dev -- -p 3001`
- Backend: Change port with `python -m uvicorn main:app --reload --port 8001`

## Next Steps

1. ✅ Set up landing page
2. ✅ Connect to FastAPI backend
3. ⬜ Create claims-anomaly project page
4. ⬜ Implement CSV data upload for claims-anomaly
5. ⬜ Build anomaly detection logic
6. ⬜ Deploy to Vercel
