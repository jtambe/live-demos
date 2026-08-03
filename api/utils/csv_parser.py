"""CSV parsing and validation utilities."""

import pandas as pd
from datetime import datetime, timedelta
from typing import Tuple, Optional

EXPECTED_COLUMNS = [
    'client_id', 'client_name', 'service_month',
    'count_eligible_primary_members',
    'num_unique_claims_medical', 'num_unique_claims_rx',
    'num_service_lines_medical', 'num_service_lines_rx',
    'total_plan_pay_medical', 'total_plan_pay_rx',
    'total_garner_incentive_paid_medical', 'total_garner_incentive_paid_rx'
]

def parse_csv(file_content: bytes) -> Tuple[bool, Optional[pd.DataFrame], str]:
    """
    Parse CSV file and return validated DataFrame.
    Returns: (success, dataframe, error_message)
    """
    try:
        df = pd.read_csv(file_content)

        # Check required columns
        missing_cols = set(EXPECTED_COLUMNS) - set(df.columns)
        if missing_cols:
            return False, None, f"Missing columns: {', '.join(missing_cols)}"

        # Convert service_month to DATE format (as string for JSON serialization)
        df['service_month'] = pd.to_datetime(df['service_month']).dt.strftime('%Y-%m-%d')

        # Convert client_id to int
        df['client_id'] = df['client_id'].astype(int)

        # Convert integer columns
        int_cols = [
            'count_eligible_primary_members',
            'num_unique_claims_medical', 'num_unique_claims_rx',
            'num_service_lines_medical', 'num_service_lines_rx'
        ]

        for col in int_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')  # Int64 allows NaN

        # Convert decimal columns
        decimal_cols = [
            'total_plan_pay_medical', 'total_plan_pay_rx',
            'total_garner_incentive_paid_medical', 'total_garner_incentive_paid_rx'
        ]

        for col in decimal_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        return True, df, ""
    except Exception as e:
        return False, None, f"Error parsing CSV: {str(e)}"

def get_data_period(df: pd.DataFrame) -> Tuple[str, str]:
    """Extract data period (earliest and latest service_month) from DataFrame."""
    min_date = df['service_month'].min()
    max_date = df['service_month'].max()
    return str(min_date), str(max_date)

def get_last_3_years_data(df: pd.DataFrame) -> pd.DataFrame:
    """Filter DataFrame to include only last 3 years of data."""
    # Convert strings back to datetime for calculation
    dates = pd.to_datetime(df['service_month'])
    max_date = dates.max()
    cutoff_date = max_date - pd.DateOffset(years=3)
    cutoff_str = cutoff_date.strftime('%Y-%m-%d')

    return df[df['service_month'] >= cutoff_str].reset_index(drop=True)
