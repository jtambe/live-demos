import jwt
import logging
from typing import Optional, Dict
from db import supabase
import os

logger = logging.getLogger(__name__)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


class AuthService:
    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """Verify Supabase Auth JWT token"""
        try:
            # Verify using Supabase's JWT secret
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None

    @staticmethod
    def login(email: str, password: str) -> Dict:
        """Authenticate user via Supabase Auth and return token"""
        try:
            # Call Supabase Auth API to sign in
            auth_response = supabase.auth.sign_in_with_password({
                'email': email,
                'password': password
            })

            if not auth_response.user:
                return {'success': False, 'error': 'Invalid email or password'}

            # Get user's role and provider info from mra_vbc_opps.users
            user_result = supabase.schema('mra_vbc_opps').table('users').select('id, role').eq('email', email).execute()
            if not user_result.data:
                return {'success': False, 'error': 'User not found in system'}

            user_data = user_result.data[0]

            return {
                'success': True,
                'token': auth_response.session.access_token,
                'user': {
                    'id': user_data['id'],
                    'email': email,
                    'role': user_data['role']
                }
            }
        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            return {'success': False, 'error': 'Authentication failed'}

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
        """Create new user in Supabase Auth (Admin only)"""
        try:
            # Create user in Supabase Auth
            auth_user = supabase.auth.admin.create_user({
                'email': email,
                'password': password,
                'email_confirm': True  # Auto-confirm email
            })

            if not auth_user.user:
                return {'success': False, 'error': 'Failed to create auth user'}

            # Create user record in mra_vbc_opps.users with role
            user_result = supabase.schema('mra_vbc_opps').table('users').insert({
                'email': email,
                'password_hash': '',  # Not used with Supabase Auth
                'role': role
            }).execute()

            if not user_result.data:
                # Rollback: delete the auth user if DB insert fails
                try:
                    supabase.auth.admin.delete_user(auth_user.user.id)
                except Exception:
                    pass
                return {'success': False, 'error': 'Failed to create user record'}

            return {'success': True, 'user_id': user_result.data[0]['id']}
        except Exception as e:
            logger.error(f"Create user error: {str(e)}", exc_info=True)
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
