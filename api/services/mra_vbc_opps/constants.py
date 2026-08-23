import os

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_TOKEN_EXPIRE_HOURS = 2

# CSV Ingestion Configuration
CSV_REQUIRED_COLUMNS = {
    'member_id', 'policy_number', 'member_name', 'date_of_birth',
    'payer_name', 'provider_group', 'provider_name', 'icd_10',
    'icd_10_description', 'initiative', 'evidence', 'source_file'
}
CSV_MAX_RECORDS = 5000
