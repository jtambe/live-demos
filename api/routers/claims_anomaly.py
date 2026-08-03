from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from typing import List
from pydantic import BaseModel
import io
import pandas as pd

from utils.supabase_ops import (
    compute_file_hash, check_analysis_exists, upsert_claims_data,
    create_analysis_run, insert_anomalies, resolve_old_anomalies,
    get_latest_anomalies, get_grouped_anomalies, get_all_claims, get_supabase,
    create_claim, update_claim, delete_claim, get_client_month_review, upsert_client_month_review
)
from utils.csv_parser import parse_csv, get_data_period, get_last_3_years_data
from utils.datetime_helper import get_utc_timestamp
from services.anomaly_analyzer import analyze_claims

router = APIRouter()

class HelloWorldResponse(BaseModel):
    message: str
    project: str
    status: str

class AnomalyResponse(BaseModel):
    id: str
    client_name: str
    service_month: str
    rule_violated: str
    affected_metrics: str
    confidence: str
    notes: str
    status: str
    first_seen_at: str
    last_seen_at: str
    recurrence_count: int

class UploadResponse(BaseModel):
    success: bool
    message: str
    next_steps: str
    file_hash: str
    rows_processed: int
    status: str

def _run_analysis_task(file_hash: str, df, original_filename: str):
    """Background task: Run anomaly analysis and store results."""
    try:
        print(f"Starting analysis task for {file_hash}")
        print(f"DataFrame shape: {df.shape}")

        df_3year = get_last_3_years_data(df)
        print(f"After 3-year filter: {df_3year.shape}")

        detected_anomalies = analyze_claims(df_3year)
        print(f"Detected {len(detected_anomalies)} anomalies")

        period_start, period_end = get_data_period(df_3year)
        print(f"Period: {period_start} to {period_end}")

        analysis_run_id = create_analysis_run(
            file_hash=file_hash,
            file_path=f"claims-monthly-data/{file_hash}_{original_filename}",
            original_filename=original_filename,
            data_period_start=period_start,
            data_period_end=period_end,
            row_count=len(df),
            anomalies_found=len(detected_anomalies)
        )
        print(f"Analysis run created with ID: {analysis_run_id}")

        if not analysis_run_id:
            print(f"Failed to create analysis run for {file_hash}")
            return

        if detected_anomalies:
            print(f"Inserting {len(detected_anomalies)} anomalies into database")
            insert_success = insert_anomalies(detected_anomalies, analysis_run_id)
            if not insert_success:
                print(f"Failed to insert anomalies for {file_hash}")
                return

        resolve_old_anomalies(analysis_run_id, detected_anomalies)
        print(f"✅ Analysis complete for {file_hash}: {len(detected_anomalies)} anomalies found")
    except Exception as e:
        import traceback
        print(f"❌ Background analysis error: {str(e)}")
        print(traceback.format_exc())

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

@router.post("/upload", response_model=UploadResponse)
async def upload_claims_csv(file: UploadFile = File(...)):
    """
    Upload claims CSV file for anomaly analysis.

    Process:
    1. Compute file hash for deduplication
    2. Check if already analyzed (return cached results)
    3. Parse and validate CSV
    4. UPSERT claims data into Supabase (fast)
    5. Return immediately with "analyzing" status
    6. Run anomaly detection in background (up to 60s)
    7. Results available via GET /anomalies
    """
    try:
        # Read file content
        content = await file.read()
        file_hash = compute_file_hash(content)

        # Check if already analyzed
        existing = check_analysis_exists(file_hash)
        if existing:
            return UploadResponse(
                success=True,
                message="File already analyzed (cached results available)",
                next_steps="Results are ready to view immediately.",
                file_hash=file_hash,
                rows_processed=existing['row_count'],
                status="complete"
            )

        # Parse CSV
        success, df, error_msg = parse_csv(io.BytesIO(content))
        if not success:
            raise HTTPException(status_code=400, detail=f"CSV parsing failed: {error_msg}")

        # UPSERT claims data into Supabase (quick operation)
        upsert_success = upsert_claims_data(df)
        if not upsert_success:
            raise HTTPException(status_code=500, detail="Failed to insert claims data")

        # Return immediately after upload
        return UploadResponse(
            success=True,
            message="✅ File uploaded successfully!",
            next_steps="Claims data imported. Go to View Claims to review and filter data, then click 'Analyze All for Anomalies' to run analysis.",
            file_hash=file_hash,
            rows_processed=len(df),
            status="complete"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/analyze")
async def analyze_all_claims(background_tasks: BackgroundTasks):
    """Trigger analysis on all claims in the database."""
    try:
        # Get all claims from database for analysis
        supabase = get_supabase()
        response = supabase.schema("claims_anomaly").table("claims_monthly").select("*").execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="No claims data found")

        # Create DataFrame from claims data
        df = pd.DataFrame(response.data)
        print(f"Loaded {len(df)} claims from database")

        # Use timestamp as analysis run ID for versioning
        analysis_id = get_utc_timestamp()

        # Start background analysis task
        background_tasks.add_task(_run_analysis_task, analysis_id, df, "batch-analysis.csv")

        return {
            "success": True,
            "message": "Analysis started",
            "status": "analyzing",
            "analysis_id": analysis_id
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in /analyze endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/anomalies", response_model=List[AnomalyResponse])
async def get_anomalies():
    """Get latest detected anomalies."""
    try:
        anomalies = get_latest_anomalies()
        return anomalies
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch anomalies: {str(e)}")

@router.get("/anomalies/grouped")
async def get_anomalies_grouped():
    """Get anomalies grouped by client_id + client_name + service_month."""
    try:
        grouped = get_grouped_anomalies()
        return grouped
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch grouped anomalies: {str(e)}")

@router.get("/claims")
async def list_claims(
    limit: int = 50,
    offset: int = 0,
    order_by: str = "client_id",
    order_desc: bool = False,
    filter_client_id: int = None,
    filter_client_name: str = None,
    filter_service_month: str = None
):
    """Get all claims data with pagination, sorting, and filtering."""
    try:
        claims, total = get_all_claims(
            limit=limit,
            offset=offset,
            order_by=order_by,
            order_desc=order_desc,
            filter_client_id=filter_client_id,
            filter_client_name=filter_client_name,
            filter_service_month=filter_service_month
        )
        return {
            "claims": claims,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch claims: {str(e)}")

@router.post("/claims")
async def create_new_claim(claim_data: dict):
    """Create a new claim record."""
    try:
        result = create_claim(claim_data)
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create claim")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create claim: {str(e)}")

@router.put("/claims/{claim_id}")
async def update_existing_claim(claim_id: int, claim_data: dict):
    """Update an existing claim record."""
    try:
        result = update_claim(claim_id, claim_data)
        if not result:
            raise HTTPException(status_code=404, detail="Claim not found")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update claim: {str(e)}")

@router.delete("/claims/{claim_id}")
async def delete_existing_claim(claim_id: int):
    """Delete a claim record."""
    try:
        success = delete_claim(claim_id)
        if not success:
            raise HTTPException(status_code=404, detail="Claim not found")
        return {"success": True, "message": "Claim deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete claim: {str(e)}")

class ClientMonthReviewSubmit(BaseModel):
    status: str
    feedback: str

class BulkClientMonthReviewSubmit(BaseModel):
    groups: List[dict]
    status: str
    feedback: str

@router.get("/client-month-review/{client_id}/{service_month}")
async def get_client_month_review_endpoint(client_id: int, service_month: str):
    """Get review status and feedback for a client + service_month."""
    try:
        review = get_client_month_review(client_id, service_month)
        return review
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch review: {str(e)}")

@router.put("/client-month-review/{client_id}/{service_month}")
async def submit_client_month_review(client_id: int, service_month: str, body: ClientMonthReviewSubmit):
    """Submit review status and feedback for a client + service_month."""
    try:
        success = upsert_client_month_review(client_id, service_month, body.status, body.feedback)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to save review")
        return {"success": True, "message": "Review saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save review: {str(e)}")

@router.put("/bulk-client-month-reviews")
async def submit_bulk_client_month_reviews(body: BulkClientMonthReviewSubmit):
    """Submit review status and feedback for multiple client + service_month groups."""
    try:
        success_count = 0
        for group in body.groups:
            success = upsert_client_month_review(
                group['client_id'],
                group['service_month'],
                body.status,
                body.feedback
            )
            if success:
                success_count += 1

        if success_count == 0:
            raise HTTPException(status_code=400, detail="Failed to save any reviews")

        return {"success": True, "message": f"Reviews saved for {success_count} groups"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save bulk reviews: {str(e)}")
