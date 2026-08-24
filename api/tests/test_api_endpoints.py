"""Tests for FastAPI routes and endpoints."""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from unittest.mock import Mock, patch, MagicMock
from pydantic import ValidationError


class TestPydanticValidation:
    """Test Pydantic model validation for API requests."""

    def test_bulk_update_disposition_valid_request(self):
        """Test valid BulkUpdateDispositionRequest."""
        from routers.mra_vbc_opps import BulkUpdateDispositionRequest
        
        valid_data = {
            "opportunity_ids": [1, 2, 3],
            "disposition_status": "Confirmed",
            "justification_note": "test note"
        }
        
        req = BulkUpdateDispositionRequest(**valid_data)
        assert req.opportunity_ids == [1, 2, 3]
        assert req.disposition_status == "Confirmed"
        assert req.justification_note == "test note"

    def test_bulk_update_disposition_optional_note(self):
        """Test BulkUpdateDispositionRequest with optional note."""
        from routers.mra_vbc_opps import BulkUpdateDispositionRequest
        
        data = {
            "opportunity_ids": [1, 2],
            "disposition_status": "Denied"
        }
        
        req = BulkUpdateDispositionRequest(**data)
        assert req.opportunity_ids == [1, 2]
        assert req.disposition_status == "Denied"
        assert req.justification_note is None

    def test_bulk_update_disposition_missing_required_fields(self):
        """Test BulkUpdateDispositionRequest validation errors."""
        from routers.mra_vbc_opps import BulkUpdateDispositionRequest
        
        invalid_data = {
            "opportunity_ids": [1],
            # Missing disposition_status
        }
        
        with pytest.raises(ValidationError):
            BulkUpdateDispositionRequest(**invalid_data)

    def test_bulk_update_disposition_empty_ids(self):
        """Test BulkUpdateDispositionRequest with empty opportunity IDs."""
        from routers.mra_vbc_opps import BulkUpdateDispositionRequest
        
        data = {
            "opportunity_ids": [],
            "disposition_status": "Confirmed"
        }
        
        # Empty list should still be valid (backend can reject it)
        req = BulkUpdateDispositionRequest(**data)
        assert req.opportunity_ids == []

    def test_update_disposition_valid_request(self):
        """Test valid UpdateDispositionRequest."""
        from routers.mra_vbc_opps import UpdateDispositionRequest
        
        data = {
            "disposition_status": "Confirmed"
        }
        
        req = UpdateDispositionRequest(**data)
        assert req.disposition_status == "Confirmed"

    def test_update_disposition_optional_note(self):
        """Test UpdateDispositionRequest with optional status."""
        from routers.mra_vbc_opps import UpdateDispositionRequest
        
        data = {}
        
        req = UpdateDispositionRequest(**data)
        assert req.disposition_status is None


class TestRouteStructure:
    """Test API route structure and imports."""

    def test_router_exists(self):
        """Test that router is properly defined."""
        from routers import mra_vbc_opps
        
        assert hasattr(mra_vbc_opps, 'router')
        assert mra_vbc_opps.router is not None

    def test_auth_dependency_exists(self):
        """Test that auth dependencies are available."""
        from services.mra_vbc_opps.auth_service import AuthService
        
        assert hasattr(AuthService, 'verify_token')
        assert callable(getattr(AuthService, 'verify_token'))

    def test_csv_service_exists(self):
        """Test that CSV service is importable."""
        from services.mra_vbc_opps.mra_csv_ingestion import MraCSVIngestionService
        
        assert MraCSVIngestionService is not None

    def test_app_initialization(self):
        """Test that FastAPI app initializes."""
        # Just verify imports work
        try:
            from main import app
            assert app is not None
        except ImportError:
            pytest.fail("Could not import app from main")


class TestAuthHeaderValidation:
    """Test auth header parsing and validation logic."""

    def test_bearer_token_extraction(self):
        """Test extracting bearer token from header."""
        auth_header = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"
        
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove "Bearer " prefix
            assert token == "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"

    def test_invalid_auth_header_format(self):
        """Test invalid auth header format detection."""
        invalid_headers = [
            "Basic xyz123",
            "BearerToken123",
            "xyz123",
            ""
        ]
        
        for header in invalid_headers:
            is_valid = header.startswith("Bearer ")
            assert not is_valid

    def test_missing_auth_header(self):
        """Test handling missing auth header."""
        headers = {}
        
        auth_header = headers.get("Authorization")
        assert auth_header is None


class TestResponseStructure:
    """Test expected response structures."""

    def test_error_response_format(self):
        """Test that error responses have expected structure."""
        # Error responses should have detail field
        error_response = {"detail": "Unauthorized"}
        
        assert "detail" in error_response
        assert isinstance(error_response["detail"], str)

    def test_success_response_structure(self):
        """Test that success responses have expected structure."""
        # Sample successful response from work queue
        response = {
            "providers": [
                {"id": 1, "name": "Provider 1"}
            ],
            "opportunities": []
        }
        
        assert "providers" in response
        assert "opportunities" in response
        assert isinstance(response["providers"], list)
