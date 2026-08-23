import jwt
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from db import supabase
from .constants import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_TOKEN_EXPIRE_HOURS

logger = logging.getLogger(__name__)


class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return hashlib.sha256(password.encode()).hexdigest() == hashed

    @staticmethod
    def create_token(email: str, role: str) -> str:
        """Create JWT token"""
        now = datetime.now(timezone.utc)
        payload = {
            'email': email,
            'role': role,
            'exp': now + timedelta(hours=JWT_TOKEN_EXPIRE_HOURS),
            'iat': now
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def login(email: str, password: str) -> Dict:
        """Authenticate user and return token"""
        try:
            result = supabase.schema('mra_vbc_opps').table('users').select('id, email, role, password_hash').eq('email', email).execute()

            if not result.data:
                return {'success': False, 'error': 'Invalid email or password'}

            user = result.data[0]
            if not AuthService.verify_password(password, user['password_hash']):
                return {'success': False, 'error': 'Invalid email or password'}

            token = AuthService.create_token(user['email'], user['role'])
            return {
                'success': True,
                'token': token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'role': user['role']
                }
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def get_user_providers(user_id: int) -> list:
        """Get list of provider IDs assigned to user"""
        try:
            result = supabase.schema('mra_vbc_opps').table('provider_user_mappings').select('provider_id').eq('user_id', user_id).execute()
            return [row['provider_id'] for row in result.data]
        except Exception as e:
            return []

    @staticmethod
    def create_user(email: str, password: str, role: str) -> Dict:
        """Create new user (Admin only)"""
        try:
            # Check if user exists
            result = supabase.schema('mra_vbc_opps').table('users').select('id').eq('email', email).execute()
            if result.data:
                return {'success': False, 'error': 'User already exists'}

            # Create user
            hashed_pw = AuthService.hash_password(password)
            result = supabase.schema('mra_vbc_opps').table('users').insert({
                'email': email,
                'password_hash': hashed_pw,
                'role': role
            }).execute()

            return {'success': True, 'user_id': result.data[0]['id']}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def assign_provider_to_user(user_id: int, provider_id: int) -> Dict:
        """Assign provider to user"""
        try:
            supabase.schema('mra_vbc_opps').table('provider_user_mappings').insert({
                'user_id': user_id,
                'provider_id': provider_id
            }).execute()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def remove_provider_from_user(user_id: int, provider_id: int) -> Dict:
        """Remove provider from user"""
        try:
            supabase.schema('mra_vbc_opps').table('provider_user_mappings').delete().eq('user_id', user_id).eq('provider_id', provider_id).execute()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @staticmethod
    def list_users() -> Dict:
        """List all users with their assigned providers"""
        try:
            logger.info("Calling RPC: list_users_admin")
            result = supabase.schema('mra_vbc_opps').rpc('list_users_admin', {}).execute()
            logger.info(f"RPC result: {result}")
            users = []
            for user in result.data:
                users.append({
                    'id': user['id'],
                    'email': user['email'],
                    'role': user['role'],
                    'created_at': user['created_at'],
                    'providers': user['providers'] or []
                })
            return {'success': True, 'users': users}
        except Exception as e:
            logger.error(f"Error in list_users: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e)}
