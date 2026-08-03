"""
Vercel serverless entry point for Claims Anomaly Detection API
"""

import sys
import os
from pathlib import Path

# Add the api directory to path for imports
api_dir = str(Path(__file__).parent)
sys.path.insert(0, api_dir)
os.chdir(api_dir)

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from routers.claims_anomaly import router as claims_router
except ImportError as e:
    print(f"Import error: {e}")
    raise

# Create FastAPI app
app = FastAPI(title="Claims Anomaly Detection API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the claims anomaly router
app.include_router(claims_router, prefix="/api/claims-anomaly")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "claims-anomaly"}
