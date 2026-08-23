import logging
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
    """Verify token and check Admin role"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    payload = AuthService.verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get('role') != 'Admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    return payload

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

        user_id = user_result.data[0]['id']
        user_providers = AuthService.get_user_providers(user_id)

        # If not admin and no providers assigned, return empty
        if payload['role'] != 'Admin' and not user_providers:
            return {'members': {}, 'total': 0, 'limit': limit, 'offset': offset}

        # For coders, enforce provider_id filtering to assigned providers
        if payload['role'] != 'Admin' and user_providers:
            if provider_id and provider_id not in user_providers:
                raise HTTPException(status_code=403, detail="Access denied to this provider")
            provider_id = None  # Coders will be filtered by user_providers in RPC

        # Call RPC function
        logger.info(f"Calling RPC: get_work_queue_data with filters: member_id={member_id}, provider_id={provider_id}, payer_id={payer_id}, initiative={initiative}, status={disposition_status}")
        try:
            result = supabase.schema('mra_vbc_opps').rpc(
                'get_work_queue_data',
                {
                    'p_member_id': member_id,
                    'p_provider_id': provider_id,
                    'p_payer_id': payer_id,
                    'p_initiative': initiative,
                    'p_disposition_status': disposition_status,
                    'p_limit': limit,
                    'p_offset': offset
                }
            ).execute()
            logger.info(f"Work queue loaded: {len(result.data)} members")
        except Exception as e:
            logger.error(f"Error calling get_work_queue_data: {str(e)}", exc_info=True)
            raise

        # Transform RPC results into member groups
        by_member = {}
        total_count = 0

        for row in result.data:
            mid = row['member_pk']
            total_count = row['total_count']

            by_member[mid] = {
                'member_id': row['member_id'],
                'member_name': row['member_name'],
                'opportunities': row['opportunities']
            }

        # Filter for coder's assigned providers if needed
        if payload['role'] != 'Admin' and user_providers:
            for mid in by_member:
                opps = by_member[mid]['opportunities']
                by_member[mid]['opportunities'] = [
                    opp for opp in opps if opp['provider_id'] in user_providers
                ]

        return {
            'members': by_member,
            'total': total_count,
            'limit': limit,
            'offset': offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/members/{member_id}/opportunities")
async def get_member_opportunities(member_id: int, include_archived: bool = False, payload = Depends(verify_token)):
    """Get all opportunities for a member (current + archived, provider-scoped)"""
    try:
        query = supabase.table('opportunities').select('*').eq('member_id', member_id)

        if not include_archived:
            query = query.eq('is_current', True)

        result = query.order('is_current', desc=True).execute()

        # For coders, verify access to these opportunities' providers
        if payload['role'] != 'Admin':
            user_result = supabase.table('users').select('id').eq('email', payload['email']).execute()
            user_id = user_result.data[0]['id']
            user_providers = AuthService.get_user_providers(user_id)

            # Filter results to only assigned providers
            result.data = [opp for opp in result.data if opp['provider_id'] in user_providers]

        return {'opportunities': result.data}
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
    """List all providers"""
    try:
        logger.info("Calling RPC: get_providers_list")
        result = supabase.schema('mra_vbc_opps').rpc('get_providers_list', {}).execute()
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
