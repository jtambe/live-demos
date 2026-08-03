"""Supabase operations for claims_anomaly project."""

import hashlib
from typing import Optional
from datetime import datetime, timedelta
import pandas as pd
from supabase import create_client, Client
from config import settings
from utils.datetime_helper import get_utc_timestamp

def get_supabase() -> Client:
    """Get authenticated Supabase client."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)

def compute_file_hash(csv_content: bytes) -> str:
    """Compute SHA256 hash of file content."""
    return hashlib.sha256(csv_content).hexdigest()

def check_analysis_exists(file_hash: str) -> Optional[dict]:
    """Check if analysis already exists for this file hash."""
    try:
        supabase = get_supabase()
        response = supabase.schema("claims_anomaly").table("analysis_runs").select("*").eq(
            "file_hash", file_hash
        ).execute()

        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error checking analysis: {str(e)}")
        return None

def upsert_claims_data(df: pd.DataFrame) -> bool:
    """UPSERT claims data into claims_monthly table."""
    try:
        supabase = get_supabase()

        # Convert DataFrame to list of dicts
        records = df.to_dict(orient='records')

        # Replace NaN with None for JSON serialization
        for record in records:
            for key, value in record.items():
                if pd.isna(value):
                    record[key] = None

        # UPSERT with on_conflict
        response = supabase.schema("claims_anomaly").table("claims_monthly").upsert(
            records,
            on_conflict="client_id,service_month"
        ).execute()

        return len(response.data) > 0
    except Exception as e:
        print(f"Error upserting claims data: {str(e)}")
        return False

def create_analysis_run(
    file_hash: str,
    file_path: str,
    original_filename: str,
    data_period_start: str,
    data_period_end: str,
    row_count: int,
    anomalies_found: int = 0
) -> Optional[str]:
    """Create analysis_runs record and return its ID."""
    try:
        supabase = get_supabase()

        response = supabase.schema("claims_anomaly").table("analysis_runs").insert({
            "file_hash": file_hash,
            "file_path": file_path,
            "original_filename": original_filename,
            "data_period_start": data_period_start,
            "data_period_end": data_period_end,
            "row_count": row_count,
            "anomalies_found": anomalies_found,
            "upload_date": get_utc_timestamp()
        }).execute()

        if response.data:
            return response.data[0]['id']
        return None
    except Exception as e:
        print(f"Error creating analysis run: {str(e)}")
        return None

def insert_anomalies(anomalies: list, analysis_run_id: str) -> bool:
    """Insert detected anomalies into anomalies table."""
    try:
        supabase = get_supabase()

        records = [
            {
                "client_id": a.get('client_id'),
                "client_name": a['client_name'],
                "service_month": a['service_month'],
                "rule_violated": a.get('rule_violated', 'unknown'),
                "affected_metrics": a['affected_metrics'],
                "confidence": a['confidence'],
                "notes": a['notes'],
                "status": "new",
                "first_seen_at": get_utc_timestamp(),
                "last_seen_at": get_utc_timestamp(),
                "recurrence_count": 1
            }
            for a in anomalies
        ]

        if records:
            response = supabase.schema("claims_anomaly").table("anomalies").insert(records).execute()
            return len(response.data) > 0
        return True
    except Exception as e:
        print(f"Error inserting anomalies: {str(e)}")
        return False

def resolve_old_anomalies(analysis_run_id: str, new_anomalies: list) -> bool:
    """Update anomalies: mark as persistent if found again, or resolved if not found."""
    try:
        supabase = get_supabase()

        # Get all current 'new' anomalies
        response = supabase.schema("claims_anomaly").table("anomalies").select("*").eq(
            "status", "new"
        ).execute()

        old_anomalies = response.data if response.data else []

        # Create set of anomalies found in new analysis (using composite key)
        new_keys = {(a['client_name'], a['service_month'], a.get('rule_violated')) for a in new_anomalies}

        # Mark anomalies as persistent if they still exist, otherwise resolved
        for anomaly in old_anomalies:
            key = (anomaly['client_name'], anomaly['service_month'], anomaly['rule_violated'])

            if key in new_keys:
                # Still found - mark as persistent and increment count
                supabase.schema("claims_anomaly").table("anomalies").update({
                    "status": "persistent",
                    "last_seen_at": get_utc_timestamp(),
                    "recurrence_count": anomaly.get('recurrence_count', 1) + 1
                }).eq("id", anomaly['id']).execute()
            else:
                # Not found in new analysis - mark as resolved
                supabase.schema("claims_anomaly").table("anomalies").update({
                    "status": "resolved",
                    "last_seen_at": get_utc_timestamp()
                }).eq("id", anomaly['id']).execute()

        return True
    except Exception as e:
        print(f"Error updating anomalies: {str(e)}")
        return False

def get_latest_anomalies() -> list:
    """Get all active (new/persistent/reopened) anomalies."""
    try:
        supabase = get_supabase()

        # Get all anomalies that are not resolved
        response = supabase.schema("claims_anomaly").table("anomalies").select("*").in_(
            "status", ["new", "persistent", "reopened"]
        ).order("last_seen_at", desc=True).execute()

        return response.data if response.data else []
    except Exception as e:
        print(f"Error getting latest anomalies: {str(e)}")
        return []

def get_grouped_anomalies() -> list:
    """Get anomalies grouped by client_id + client_name + service_month with review status."""
    try:
        supabase = get_supabase()

        # Get all active anomalies
        response = supabase.schema("claims_anomaly").table("anomalies").select("*").in_(
            "status", ["new", "persistent", "reopened"]
        ).order("last_seen_at", desc=True).execute()

        anomalies = response.data if response.data else []

        # Get all review statuses
        reviews_response = supabase.schema("claims_anomaly").table("client_month_reviews").select("*").execute()
        reviews = {(r['client_id'], r['service_month']): r for r in (reviews_response.data or [])}

        # Group by client_id + client_name + service_month
        grouped = {}
        for anomaly in anomalies:
            key = (anomaly['client_id'], anomaly['client_name'], anomaly['service_month'])
            if key not in grouped:
                review = reviews.get((anomaly['client_id'], anomaly['service_month']), {})
                grouped[key] = {
                    'client_id': anomaly['client_id'],
                    'client_name': anomaly['client_name'],
                    'service_month': anomaly['service_month'],
                    'rules_violated': [],
                    'rule_count': 0,
                    'max_confidence': 'low',
                    'last_seen_at': anomaly['last_seen_at'],
                    'review_status': review.get('status'),
                    'review_feedback': review.get('feedback', '')
                }

            grouped[key]['rules_violated'].append({
                'id': anomaly['id'],
                'rule': anomaly['rule_violated'],
                'confidence': anomaly['confidence'],
                'affected_metrics': anomaly['affected_metrics'],
                'notes': anomaly['notes'],
                'status': anomaly['status']
            })
            grouped[key]['rule_count'] = len(grouped[key]['rules_violated'])

            # Track highest confidence
            confidence_order = {'high': 3, 'medium': 2, 'low': 1}
            current_order = confidence_order.get(grouped[key]['max_confidence'], 0)
            anomaly_order = confidence_order.get(anomaly['confidence'], 0)
            if anomaly_order > current_order:
                grouped[key]['max_confidence'] = anomaly['confidence']

        # Convert to list and sort by client_id asc, then service_month asc
        result = list(grouped.values())
        result.sort(key=lambda x: (x['client_id'], x['service_month']))

        return result
    except Exception as e:
        print(f"Error getting grouped anomalies: {str(e)}")
        return []

def get_client_month_review(client_id: int, service_month: str) -> dict:
    """Get review status and feedback for a client + service_month."""
    try:
        supabase = get_supabase()

        response = supabase.schema("claims_anomaly").table("client_month_reviews").select("*").eq(
            "client_id", client_id
        ).eq("service_month", service_month).execute()

        if response.data and len(response.data) > 0:
            data = response.data[0]
            return {
                "status": data.get("status"),
                "feedback": data.get("feedback", "")
            }
        return {"status": None, "feedback": ""}
    except Exception as e:
        print(f"Error getting client month review: {str(e)}")
        return {"status": None, "feedback": ""}

def upsert_client_month_review(client_id: int, service_month: str, status: str, feedback: str) -> bool:
    """Insert or update review status and feedback for a client + service_month."""
    try:
        supabase = get_supabase()

        response = supabase.schema("claims_anomaly").table("client_month_reviews").upsert({
            "client_id": client_id,
            "service_month": service_month,
            "status": status,
            "feedback": feedback,
            "reviewed_at": get_utc_timestamp() if status == "reviewed" else None
        }, on_conflict="client_id,service_month").execute()

        return len(response.data) > 0
    except Exception as e:
        print(f"Error upserting client month review: {str(e)}")
        return False

def get_all_claims(
    limit: int = 50,
    offset: int = 0,
    order_by: str = "client_id",
    order_desc: bool = False,
    filter_client_id: Optional[int] = None,
    filter_client_name: Optional[str] = None,
    filter_service_month: Optional[str] = None
) -> tuple[list, int]:
    """Get all claims with pagination, sorting, and filtering. Returns (claims, total_count)."""
    try:
        supabase = get_supabase()
        query = supabase.schema("claims_anomaly").table("claims_monthly").select("*", count="exact")

        # Apply filters
        if filter_client_id is not None:
            query = query.eq("client_id", filter_client_id)
        if filter_client_name:
            query = query.ilike("client_name", f"%{filter_client_name}%")
        if filter_service_month:
            query = query.eq("service_month", filter_service_month)

        # Apply sorting
        query = query.order(order_by, desc=order_desc)

        # Apply pagination
        response = query.range(offset, offset + limit - 1).execute()

        total = response.count if hasattr(response, 'count') else 0
        data = response.data if response.data else []
        return data, total
    except Exception as e:
        print(f"Error getting claims: {str(e)}")
        return [], 0

def create_claim(claim_data: dict) -> Optional[dict]:
    """Create a new claim record."""
    try:
        supabase = get_supabase()
        response = supabase.schema("claims_anomaly").table("claims_monthly").insert(claim_data).execute()

        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error creating claim: {str(e)}")
        return None

def update_claim(claim_id: int, claim_data: dict) -> Optional[dict]:
    """Update an existing claim record."""
    try:
        supabase = get_supabase()
        response = supabase.schema("claims_anomaly").table("claims_monthly").update(
            claim_data
        ).eq("id", claim_id).execute()

        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error updating claim: {str(e)}")
        return None

def delete_claim(claim_id: int) -> bool:
    """Delete a claim record."""
    try:
        supabase = get_supabase()
        response = supabase.schema("claims_anomaly").table("claims_monthly").delete().eq(
            "id", claim_id
        ).execute()

        return True
    except Exception as e:
        print(f"Error deleting claim: {str(e)}")
        return False

