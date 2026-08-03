import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import claims_anomaly

load_dotenv()

app = FastAPI(
    title="Live Demos API",
    description="Backend API for live demos",
    version="0.1.0"
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://vercel.app",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "live-demos-api"}

# Include routers
app.include_router(claims_anomaly.router, prefix="/api/claims-anomaly", tags=["claims-anomaly"])

@app.get("/")
async def root():
    return {
        "message": "Live Demos API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
