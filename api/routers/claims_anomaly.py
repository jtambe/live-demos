from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class HelloWorldResponse(BaseModel):
    message: str
    project: str
    status: str

class ClaimData(BaseModel):
    id: str
    amount: float
    description: Optional[str] = None

@router.get("/hello", response_model=HelloWorldResponse)
async def hello_world():
    """Hello world endpoint for claims-anomaly project"""
    return {
        "message": "Hello from Claims Anomaly Detection!",
        "project": "claims-anomaly",
        "status": "ready"
    }

@router.get("/status")
async def project_status():
    """Get project status"""
    return {
        "project": "claims-anomaly",
        "status": "active",
        "description": "Claims anomaly detection system",
        "version": "0.1.0"
    }

@router.post("/analyze")
async def analyze_claim(claim: ClaimData):
    """
    Analyze a claim for anomalies.
    This is a placeholder endpoint.
    """
    return {
        "claim_id": claim.id,
        "amount": claim.amount,
        "anomaly_score": 0.0,
        "message": "Analysis complete (placeholder)"
    }
