"""Anomaly detection service - integrates 20 rules from anomaly_rules module."""

import pandas as pd
from typing import List, Dict
from services.anomaly_rules import detect_anomalies as detect_anomalies_rules

def analyze_claims(df: pd.DataFrame) -> List[Dict]:
    """
    Detect anomalies in claims data using all 20 detection rules.

    Rules:
    - Hard rules (1-13): Financial consistency, logical constraints, data quality
    - Temporal rules (14-20): Week-over-week tracking, aggregation patterns

    Args:
        df: Claims DataFrame

    Returns:
        List of anomalies with structure:
        {
            'client_name': str,
            'service_month': str (YYYY-MM-DD),
            'affected_metrics': str (comma-separated column names),
            'confidence': str ('low', 'medium', 'high'),
            'notes': str
        }
    """
    anomalies = detect_anomalies_rules(df)
    return anomalies
