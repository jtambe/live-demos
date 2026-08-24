import csv
import io
import logging
import re
from typing import Dict, List, Tuple
from db import supabase
from .constants import CSV_REQUIRED_COLUMNS, CSV_MAX_RECORDS

logger = logging.getLogger(__name__)


class MraCSVIngestionService:
    """Handles MRA CSV parsing and bulk ingestion via stored procedure"""

    def __init__(self, filename: str, uploaded_by: str):
        self.filename = filename
        self.uploaded_by = uploaded_by
        self.errors = []

    def parse_csv(self, file_content: bytes) -> List[Dict]:
        """Parse CSV with proper handling of quoted fields"""
        try:
            text = file_content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(text))

            if not reader.fieldnames:
                self.errors.append("CSV has no headers")
                return []

            # Validate headers
            missing = CSV_REQUIRED_COLUMNS - set(reader.fieldnames)
            if missing:
                self.errors.append(f"Missing columns: {missing}")
                return []

            rows = list(reader)

            # Check record limit
            if len(rows) > CSV_MAX_RECORDS:
                self.errors.append(f"CSV has {len(rows)} records, max is {CSV_MAX_RECORDS}")
                return []

            return rows
        except Exception as e:
            self.errors.append(f"CSV parse error: {str(e)}")
            return []

    def validate_row(self, row: Dict, row_num: int) -> Tuple[bool, str]:
        """Validate required fields in a row"""
        required = ['member_id', 'icd_10', 'payer_name', 'provider_name', 'provider_group', 'initiative']
        for field in required:
            if not row.get(field) or not str(row[field]).strip():
                return False, f"Row {row_num}: Missing {field}"
        return True, ""

    def extract_year_month(self, source_file: str) -> str:
        """Extract YYYYMM from source_file (e.g., 'MRA_202501.csv' -> '202501')"""
        match = re.search(r'(\d{6})', source_file)
        return match.group(1) if match else None

    def ingest(self, file_content: bytes) -> Dict:
        """Main ingestion flow - parse CSV and call stored procedure"""
        rows = self.parse_csv(file_content)
        if not rows:
            return {
                'success': False,
                'upload_id': None,
                'errors': self.errors,
                'counts': {'inserted': 0, 'updated': 0, 'skipped': 0, 'non_hcc': 0}
            }

        # Validate all rows first
        validated_rows = []
        for idx, row in enumerate(rows, 1):
            valid, error_msg = self.validate_row(row, idx)
            if not valid:
                self.errors.append(error_msg)
                continue
            validated_rows.append(row)

        if not validated_rows:
            return {
                'success': False,
                'upload_id': None,
                'errors': self.errors,
                'counts': {'inserted': 0, 'updated': 0, 'skipped': 0, 'non_hcc': 0}
            }

        # Extract unique entities for bulk upsert
        members = []
        payers = set()
        providers = set()
        opportunities = []
        seen_members = set()

        for row in validated_rows:
            member_id = str(row['member_id']).strip()
            member_key = member_id
            if member_key not in seen_members:
                members.append({
                    'member_id': member_id,
                    'member_name': str(row['member_name']).strip(),
                    'dob': str(row['date_of_birth']).strip()
                })
                seen_members.add(member_key)

            payers.add(str(row['payer_name']).strip())
            provider_key = (str(row['provider_name']).strip(), str(row['provider_group']).strip())
            providers.add(provider_key)

            source_file_str = str(row['source_file']).strip()
            opportunities.append({
                'member_id': member_id,
                'policy_number': str(row['policy_number']).strip(),
                'payer_name': str(row['payer_name']).strip(),
                'provider_name': str(row['provider_name']).strip(),
                'provider_group': str(row['provider_group']).strip(),
                'icd_10': str(row['icd_10']).strip(),
                'icd_10_description': row.get('icd_10_description', '').strip() or None,
                'hcc_code': row.get('hcc_code', '').strip() or None,
                'hcc_description': row.get('hcc_description', '').strip() or None,
                'initiative': str(row['initiative']).strip(),
                'evidence': row.get('evidence', '').strip() or None,
                'last_dos': row.get('last_dos', '').strip() or None,
                'source_file': source_file_str,
                'source_year_month': self.extract_year_month(source_file_str)
            })

        # Call stored procedure
        try:
            payload = {
                'members': members,
                'payers': [{'payer_name': p} for p in payers],
                'providers': [{'provider_name': p[0], 'provider_group': p[1]} for p in providers],
                'opportunities': opportunities
            }

            logger.info(f"Calling RPC: bulk_ingest_csv with {len(opportunities)} opportunities, {len(members)} unique members, {len(payers)} payers, {len(providers)} providers")
            result = supabase.schema('mra_vbc_opps').rpc(
                'bulk_ingest_csv',
                {
                    'p_upload_filename': self.filename,
                    'p_uploaded_by': self.uploaded_by,
                    'p_data': payload
                }
            ).execute()
            logger.info(f"Bulk ingest result: {result.data}")

            if result.data:
                response = result.data[0] if isinstance(result.data, list) else result.data
                return {
                    'success': response.get('success', False),
                    'upload_id': response.get('upload_id'),
                    'errors': response.get('errors', []),
                    'counts': response.get('counts', {'inserted': 0, 'updated': 0, 'duplicates': 0, 'skipped': 0, 'non_hcc': 0})
                }
            else:
                self.errors.append("Stored procedure returned no data")
                return {
                    'success': False,
                    'upload_id': None,
                    'errors': self.errors,
                    'counts': {'inserted': 0, 'updated': 0, 'duplicates': 0, 'skipped': 0, 'non_hcc': 0}
                }
        except Exception as e:
            self.errors.append(f"Bulk ingestion failed: {str(e)}")
            return {
                'success': False,
                'upload_id': None,
                'errors': self.errors,
                'counts': {'inserted': 0, 'updated': 0, 'skipped': 0, 'non_hcc': 0}
            }
