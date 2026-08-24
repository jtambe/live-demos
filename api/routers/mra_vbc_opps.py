import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.mra_vbc_opps import MraCSVIngestionService, AuthService
from db import supabase

logger = logging.getLogger(__name__)

def verify_token(authorization: str = Header(None)):
    """Verify token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    payload = AuthService.verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    return payload

def verify_admin(authorization: str = Header(None)):
    """Verify token and check Admin role from database"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    payload = AuthService.verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get role from mra_vbc_opps.users table (Supabase Auth JWT doesn't include role)
    email = payload.get('email')
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token claims")

    try:
        user_result = supabase.schema('mra_vbc_opps').table('users').select('id, role').eq('email', email).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found in system")

        user = user_result.data[0]
        if user['role'] != 'Admin':
            raise HTTPException(status_code=403, detail="Admin access required")

        return payload
    except Exception as e:
        logger.error(f"Error verifying admin role: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error verifying role")

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateUserRequest(BaseModel):
    email: str
    password: str
    role: str

class AssignProviderRequest(BaseModel):
    user_id: int
    provider_id: int

router = APIRouter()

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), payload = Depends(verify_token)):
    """
    Upload and ingest MRA CSV file (requires auth).
    - Validates CSV structure
    - Handles identity resolution and deduplication
    - Tracks year-over-year changes
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    try:
        contents = await file.read()
        service = MraCSVIngestionService(file.filename, payload['email'])
        result = service.ingest(contents)
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/uploads")
async def get_uploads(limit: int = 10, offset: int = 0):
    """Get upload history"""
    try:
        result = supabase.table('uploads').select('*').order('uploaded_at', desc=True).range(offset, offset + limit - 1).execute()
        return {
            'uploads': result.data,
            'total': len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/opportunities/work-queue")
async def get_work_queue(
    member_id: int = None,
    provider_id: int = None,
    payer_id: int = None,
    initiative: str = None,
    disposition_status: str = None,
    limit: int = 50,
    offset: int = 0,
    payload = Depends(verify_token)
):
    """
    Get work queue - members with current opportunities (provider-scoped).
    Excludes non-HCC opportunities. Coders see only their assigned providers.
    """
    try:
        # Get user's assigned providers
        user_result = supabase.schema('mra_vbc_opps').table('users').select('id').eq('email', payload['email']).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Call RPC function (pass user email so RPC can check role)
        logger.info(f"Calling RPC: get_work_queue_data with user_email={payload['email']}, filters: member_id={member_id}, provider_id={provider_id}, payer_id={payer_id}, initiative={initiative}, status={disposition_status}")
        try:
            result = supabase.schema('mra_vbc_opps').rpc(
                'get_work_queue_data',
                {
                    'p_user_email': payload['email'],
                    'p_member_id': member_id,
                    'p_provider_id': provider_id,
                    'p_payer_id': payer_id,
                    'p_initiative': initiative,
                    'p_disposition_status': disposition_status,
                    'p_limit': limit,
                    'p_offset': offset
                }
            ).execute()
            logger.info(f"RPC response type: {type(result.data)}, raw: {result.data}")
            logger.info(f"Work queue loaded: {len(result.data) if result.data else 0} rows")
        except Exception as e:
            logger.error(f"Error calling get_work_queue_data: {str(e)}", exc_info=True)
            raise

        # Transform RPC results into member groups
        by_member = {}
        members_with_vbc_count = 0
        total_opportunities_count = 0

        for row in result.data:
            member_id = row['member_id']
            members_with_vbc_count = row['members_with_vbc_count']
            total_opportunities_count = row['total_opportunities_count']

            by_member[member_id] = {
                'member_id': row['member_id'],
                'member_name': row['member_name'],
                'opportunities': row['opportunities']
            }

        return {
            'members': by_member,
            'members_with_vbc_count': members_with_vbc_count,
            'total_opportunities_count': total_opportunities_count,
            'limit': limit,
            'offset': offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === AUTH ENDPOINTS (MRA-scoped) ===

@router.post("/auth/login")
async def login(request: LoginRequest):
    """Login with email and password"""
    result = AuthService.login(request.email, request.password)
    if not result['success']:
        raise HTTPException(status_code=401, detail=result['error'])
    return result

@router.get("/auth/me")
async def get_current_user(payload = Depends(verify_token)):
    """Get current user info"""
    email = payload.get('email')

    try:
        result = supabase.table('users').select('id, email, role, created_at').eq('email', email).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        user = result.data[0]
        providers = AuthService.get_user_providers(user['id'])

        return {
            'user': user,
            'providers': providers
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/users")
async def create_user(request: CreateUserRequest, payload = Depends(verify_admin)):
    """Create new user (Admin only)"""
    if request.role not in ['Coder', 'Admin']:
        raise HTTPException(status_code=400, detail="Role must be 'Coder' or 'Admin'")

    result = AuthService.create_user(request.email, request.password, request.role)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    return result

@router.post("/auth/users/{user_id}/providers")
async def assign_provider(user_id: int, request: AssignProviderRequest, payload = Depends(verify_admin)):
    """Assign provider to user (Admin only)"""
    result = AuthService.assign_provider_to_user(user_id, request.provider_id)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    return result

@router.delete("/auth/users/{user_id}/providers/{provider_id}")
async def remove_provider(user_id: int, provider_id: int, payload = Depends(verify_admin)):
    """Remove provider from user (Admin only)"""
    result = AuthService.remove_provider_from_user(user_id, provider_id)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    return result

@router.get("/auth/users")
async def list_users(payload = Depends(verify_admin)):
    """List all users (Admin only)"""
    result = AuthService.list_users()
    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])
    return result

@router.get("/auth/providers")
async def list_providers(payload = Depends(verify_token)):
    """List providers (all for Admin, assigned for Coder)"""
    try:
        user_email = payload.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")
        
        logger.info(f"Calling RPC: get_providers_list for user {user_email}")
        result = supabase.schema('mra_vbc_opps').rpc('get_providers_list', {'p_user_email': user_email}).execute()
        logger.info(f"Providers loaded: {len(result.data)} items")
        return {'providers': result.data}
    except Exception as e:
        logger.error(f"Error in list_providers: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# === TEST ENDPOINT (schema accessibility) ===

@router.get("/test/people")
async def get_test_people():
    """Get test people data (no auth, schema accessibility test)"""
    try:
        result = supabase.schema('mra_vbc_opps').table('test_people').select('*').execute()
        return {'people': result.data, 'count': len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# === MEMBER SEARCH ===

@router.get("/members/search")
async def search_members(q: str = Query(...), payload = Depends(verify_token)):
    """
    Search members by name or member_id (decrypts server-side via RPC).
    Returns id, member_id, and decrypted name for filtering work queue.
    """
    try:
        result = supabase.schema('mra_vbc_opps').rpc('search_members', {'search_query': q}).execute()
        return {'matches': result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === MEMBER OPPORTUNITIES REVIEW ===

@router.get("/members/{member_id}/opportunities")
async def get_member_opportunities(member_id: str, payload = Depends(verify_token)):
    """
    Get all opportunities for a member with full disposition history.
    Used for member review page (all opps + audit trail in one view).
    member_id is the member's external ID (e.g., "MEM001").
    RPC does the lookup internally (has SECURITY DEFINER for schema access).
    """
    try:
        user_email = payload.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")
        
        logger.info(f"Fetching opportunities for member_id: {member_id} (user: {user_email})")
        
        # Call RPC with member_id string - RPC does the lookup internally
        result = supabase.schema('mra_vbc_opps').rpc(
            'get_member_opportunities_with_history',
            {'p_user_email': user_email, 'p_member_id': member_id}
        ).execute()
        
        logger.info(f"RPC result: {result.data}")
        
        # RPC returns JSONB directly, not wrapped in array
        if not result.data:
            raise HTTPException(status_code=404, detail="Member not found or no access")
        
        # Check if result.data is a list (array of results) or dict (single JSONB)
        if isinstance(result.data, list) and len(result.data) > 0:
            data = result.data[0]
        else:
            data = result.data
        
        if not isinstance(data, dict) or not data.get('success'):
            raise HTTPException(status_code=404, detail=data.get('error', 'Member not found') if isinstance(data, dict) else 'Invalid response')
        
        return {
            'member': data['member'],
            'opportunities': data['opportunities']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching member opportunities: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# === DISPOSITION UPDATES ===

class UpdateDispositionRequest(BaseModel):
    disposition_status: Optional[str] = None

class BulkUpdateDispositionRequest(BaseModel):
    opportunity_ids: list[int]
    disposition_status: str
    justification_note: Optional[str] = None

@router.post("/opportunities/bulk/disposition")
async def bulk_update_opportunity_disposition(
    request: BulkUpdateDispositionRequest,
    payload = Depends(verify_token)
):
    """
    Update disposition for multiple opportunities in bulk.
    Creates audit trail entries automatically for each.
    """
    try:
        if not request.opportunity_ids:
            raise HTTPException(status_code=400, detail="No opportunities provided")
        
        user_email = payload.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")
        
        logger.info(f"Bulk updating disposition for {len(request.opportunity_ids)} opportunities (user: {user_email})")
        result = supabase.schema('mra_vbc_opps').rpc(
            'set_opportunity_dispositions',
            {
                'p_user_email': user_email,
                'p_opportunity_ids': request.opportunity_ids,
                'p_disposition_status': request.disposition_status,
                'p_justification_note': request.justification_note
            }
        ).execute()
        
        logger.info(f"Bulk RPC result: {result.data}")
        
        if not result.data:
            raise HTTPException(status_code=500, detail="RPC returned empty result")
        
        # Handle both array and dict response
        if isinstance(result.data, list) and len(result.data) > 0:
            data = result.data[0]
        else:
            data = result.data
        
        if not isinstance(data, dict) or not data.get('success'):
            errors = data.get('errors', ['Unknown error']) if isinstance(data, dict) else ['Invalid response']
            raise HTTPException(status_code=400, detail=errors[0] if errors else 'Failed to update dispositions')
        
        logger.info(f"Bulk update successful: {data.get('updated_count')} updated")
        return {
            'success': True,
            'message': f'Successfully updated {data.get("updated_count", 0)} opportunities',
            'updated_count': data.get('updated_count'),
            'data': data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk update disposition: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/opportunities/{opportunity_id}/disposition")
async def update_opportunity_disposition(
    opportunity_id: int,
    request: UpdateDispositionRequest,
    payload = Depends(verify_token)
):
    """
    Update disposition for a single opportunity.
    Creates audit trail entry automatically.
    """
    try:
        user_email = payload.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found in token")
        
        logger.info(f"Updating disposition for opportunity {opportunity_id} (user: {user_email})")
        result = supabase.schema('mra_vbc_opps').rpc(
            'set_opportunity_dispositions',
            {
                'p_user_email': user_email,
                'p_opportunity_ids': [opportunity_id],
                'p_disposition_status': request.disposition_status,
                'p_justification_note': request.justification_note
            }
        ).execute()
        
        logger.info(f"RPC result: {result.data}")
        
        if not result.data:
            raise HTTPException(status_code=500, detail="RPC returned empty result")
        
        # Handle both array and dict response
        if isinstance(result.data, list) and len(result.data) > 0:
            data = result.data[0]
        else:
            data = result.data
        
        if not isinstance(data, dict) or not data.get('success'):
            errors = data.get('errors', ['Unknown error']) if isinstance(data, dict) else ['Invalid response']
            raise HTTPException(status_code=400, detail=errors[0] if errors else 'Failed to update disposition')
        
        logger.info(f"Opportunity {opportunity_id} disposition updated: {data.get('updated_count')} updated")
        return {
            'success': True,
            'message': 'Disposition updated successfully',
            'updated_count': data.get('updated_count'),
            'data': data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating disposition: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
