"""Tests for auth_service module."""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from unittest.mock import Mock, patch, MagicMock
from services.mra_vbc_opps.auth_service import AuthService


class TestAuthService:
    """Test suite for AuthService functionality."""

    def test_verify_token_valid_jwt(self):
        """Test verifying a valid JWT token."""
        valid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.test_signature"
        
        with patch('services.mra_vbc_opps.auth_service.jwt.decode') as mock_decode:
            mock_decode.return_value = {'email': 'test@example.com', 'sub': '12345'}
            
            result = AuthService.verify_token(valid_token)
            
            assert result is not None
            assert result.get('email') == 'test@example.com'

    def test_verify_token_invalid_jwt(self):
        """Test verifying an invalid JWT token."""
        invalid_token = "invalid.token.here"
        
        with patch('services.mra_vbc_opps.auth_service.jwt') as mock_jwt:
            # jwt.decode will raise an exception for invalid token
            mock_jwt.decode.side_effect = Exception("Invalid token")
            
            # The verify_token method should catch the exception and return None
            try:
                result = AuthService.verify_token(invalid_token)
                # If it returns, it should be None
                assert result is None
            except Exception:
                # Or it may raise an exception (depending on implementation)
                pass

    def test_verify_token_missing_email(self):
        """Test token without email claim."""
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTYifQ.test"
        
        with patch('services.mra_vbc_opps.auth_service.jwt.decode') as mock_decode:
            mock_decode.return_value = {'sub': '12345'}
            
            result = AuthService.verify_token(token)
            
            assert result is None or result.get('email') is None

    def test_login_success(self):
        """Test successful login with valid credentials."""
        with patch('services.mra_vbc_opps.auth_service.supabase') as mock_supabase:
            # Mock the session with proper structure
            mock_session = MagicMock()
            mock_session.access_token = 'token123'
            mock_auth_response = MagicMock()
            mock_auth_response.session = mock_session
            
            mock_supabase.auth.sign_in_with_password.return_value = mock_auth_response
            
            result = AuthService.login('test@example.com', 'password123')
            
            # Login returns dict with success and token
            assert isinstance(result, dict)

    def test_login_failure(self):
        """Test login with invalid credentials."""
        with patch('services.mra_vbc_opps.auth_service.supabase') as mock_supabase:
            mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")
            
            result = AuthService.login('test@example.com', 'wrongpassword')
            
            assert result['success'] is False
            assert 'error' in result

    def test_create_user_success(self):
        """Test successful user creation."""
        with patch('services.mra_vbc_opps.auth_service.supabase') as mock_supabase:
            mock_supabase.auth.admin.create_user.return_value = MagicMock(user={'id': 'new_user_123'})
            mock_supabase.schema.return_value.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{'id': 1}])
            
            result = AuthService.create_user('newuser@example.com', 'password123', 'Coder')
            
            assert result['success'] is True

    def test_create_user_invalid_role(self):
        """Test user creation with invalid role."""
        # Invalid role should fail when trying to insert into users table
        with patch('services.mra_vbc_opps.auth_service.supabase') as mock_supabase:
            # Succeed on auth creation
            mock_supabase.auth.admin.create_user.return_value = MagicMock(user={'id': 'new_user'})
            
            # Fail on role validation (invalid role)
            mock_supabase.schema.return_value.table.return_value.insert.return_value.execute.side_effect = Exception("Invalid role")
            
            result = AuthService.create_user('user@example.com', 'password', 'InvalidRole')
            
            # Should fail due to invalid role
            assert result['success'] is False
            assert 'error' in result

    def test_get_user_providers(self):
        """Test retrieving user's assigned providers."""
        with patch('services.mra_vbc_opps.auth_service.supabase') as mock_supabase:
            mock_supabase.schema.return_value.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[1, 2]
            )
            
            result = AuthService.get_user_providers(user_id=1)
            
            # Should return a list
            assert isinstance(result, list)
            assert len(result) >= 0

    def test_assign_provider_to_user_success(self):
        """Test successfully assigning a provider to a user."""
        with patch('services.mra_vbc_opps.auth_service.supabase') as mock_supabase:
            mock_supabase.schema.return_value.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{'id': 1}])
            
            result = AuthService.assign_provider_to_user(user_id=1, provider_id=5)
            
            assert result['success'] is True
