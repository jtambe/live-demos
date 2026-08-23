import os

# CSV Ingestion Configuration
CSV_REQUIRED_COLUMNS = {
    'member_id', 'policy_number', 'member_name', 'date_of_birth',
    'payer_name', 'provider_group', 'provider_name', 'icd_10',
    'icd_10_description', 'initiative', 'evidence', 'source_file'
}
CSV_MAX_RECORDS = 5000
