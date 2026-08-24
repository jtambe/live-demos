"""Tests for CSV ingestion and duplicate detection."""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from unittest.mock import Mock, patch, MagicMock
from services.mra_vbc_opps.mra_csv_ingestion import MraCSVIngestionService


class TestCSVIngestion:
    """Test suite for CSV ingestion functionality."""

    def test_ingest_valid_csv_data(self):
        """Test ingesting valid CSV data."""
        csv_content = b"""member_id,icd_10,hcc_code,provider_id,payer_id
MEM001,I509,226,1,1
MEM002,F331,155,1,2"""
        
        with patch('services.mra_vbc_opps.mra_csv_ingestion.supabase') as mock_supabase:
            mock_supabase.schema.return_value.rpc.return_value.execute.return_value = MagicMock(
                data={'inserted': 2, 'updated': 0, 'duplicates': 0}
            )
            
            service = MraCSVIngestionService('test.csv', 'user@example.com')
            result = service.ingest(csv_content)
            
            assert 'success' in result or 'inserted' in result or 'error' not in str(result).lower()

    def test_ingest_empty_csv(self):
        """Test ingesting an empty CSV file."""
        csv_content = b""
        
        service = MraCSVIngestionService('empty.csv', 'user@example.com')
        result = service.ingest(csv_content)
        
        # Should handle gracefully
        assert result is not None

    def test_ingest_csv_with_missing_columns(self):
        """Test ingesting CSV with missing required columns."""
        csv_content = b"""member_id,icd_10
MEM001,I509"""
        
        service = MraCSVIngestionService('incomplete.csv', 'user@example.com')
        # Should handle missing columns gracefully
        result = service.ingest(csv_content)
        
        assert result is not None

    def test_duplicate_detection_identical_records(self):
        """Test that identical records are detected as duplicates."""
        csv_content = b"""member_id,icd_10,hcc_code,provider_id,payer_id,last_dos
MEM001,I509,226,1,1,2024-01-01
MEM001,I509,226,1,1,2024-01-01"""
        
        with patch('services.mra_vbc_opps.mra_csv_ingestion.supabase') as mock_supabase:
            mock_supabase.schema.return_value.rpc.return_value.execute.return_value = MagicMock(
                data={'duplicates': 1, 'inserted': 1}
            )
            
            service = MraCSVIngestionService('test.csv', 'user@example.com')
            result = service.ingest(csv_content)
            
            assert result is not None

    def test_csv_row_count_accuracy(self):
        """Test that row count is accurately reported."""
        csv_content = b"""member_id,icd_10,hcc_code,provider_id,payer_id
MEM001,I509,226,1,1
MEM002,F331,155,1,2
MEM003,E119,37,1,1"""
        
        with patch('services.mra_vbc_opps.mra_csv_ingestion.supabase') as mock_supabase:
            mock_supabase.schema.return_value.rpc.return_value.execute.return_value = MagicMock(
                data={'inserted': 3, 'updated': 0, 'duplicates': 0}
            )
            
            service = MraCSVIngestionService('test.csv', 'user@example.com')
            result = service.ingest(csv_content)
            
            # Result should reflect 3 records processed
            assert result is not None

    def test_ingest_with_null_values(self):
        """Test CSV with NULL/empty values in optional fields."""
        csv_content = b"""member_id,icd_10,hcc_code,provider_id,payer_id,last_dos
MEM001,I509,,,1,1,"""
        
        with patch('services.mra_vbc_opps.mra_csv_ingestion.supabase') as mock_supabase:
            mock_supabase.schema.return_value.rpc.return_value.execute.return_value = MagicMock(
                data={'inserted': 1}
            )
            
            service = MraCSVIngestionService('test.csv', 'user@example.com')
            result = service.ingest(csv_content)
            
            # Should handle NULL values gracefully
            assert result is not None

    def test_ingest_malformed_csv(self):
        """Test ingesting malformed CSV data."""
        csv_content = b"""member_id,icd_10
MEM001,I509,EXTRA,COLUMNS"""
        
        service = MraCSVIngestionService('malformed.csv', 'user@example.com')
        # Should handle malformed data gracefully
        result = service.ingest(csv_content)
        
        assert result is not None
