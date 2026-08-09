"""
Anomaly Detection Rules for Claims Data Analysis

20 rules covering:
- Hard rules (1-13): Financial consistency, logical constraints, data quality
- Temporal rules (14-20): Week-over-week tracking, aggregation patterns
"""

import pandas as pd
from typing import List, Dict, Tuple
from datetime import datetime


class Anomaly:
    """Represents a detected anomaly"""
    def __init__(self, client_name: str, service_month: str, rule_violated: str,
                 confidence: str, affected_metrics: List[str], notes: str):
        self.client_name = client_name
        self.service_month = service_month
        self.rule_violated = rule_violated
        self.confidence = confidence
        self.affected_metrics = ",".join(affected_metrics)
        self.notes = notes


def rule_1_negative_values(df: pd.DataFrame) -> List[Tuple]:
    """
    Rule 1: Negative values in any numeric field
    Financial and count data cannot be negative
    """
    violations = []
    numeric_cols = [
        'total_plan_pay_medical', 'total_plan_pay_rx',
        'total_garner_incentive_paid_medical', 'total_garner_incentive_paid_rx',
        'count_eligible_primary_members', 'num_unique_claims_medical',
        'num_unique_claims_rx', 'num_service_lines_medical', 'num_service_lines_rx'
    ]

    for idx, row in df.iterrows():
        bad_cols = []
        for col in numeric_cols:
            if pd.notna(row[col]) and row[col] < 0:
                bad_cols.append(col)

        if bad_cols:
            violations.append((
                row['client_name'],
                row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                'rule_1',
                'high',
                bad_cols,
                f"negative values in: {', '.join(bad_cols)}"
            ))

    return violations


def rule_2_med_lines_less_claims(df: pd.DataFrame) -> List[Tuple]:
    """Rule 2: Medical service lines < medical claims (impossible)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['num_service_lines_medical']) and pd.notna(row['num_unique_claims_medical']):
            if row['num_service_lines_medical'] < row['num_unique_claims_medical']:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_2',
                    'high',
                    ['num_service_lines_medical', 'num_unique_claims_medical'],
                    f"service lines ({int(row['num_service_lines_medical'])}) < claims ({int(row['num_unique_claims_medical'])})"
                ))

    return violations


def rule_3_rx_lines_less_claims(df: pd.DataFrame) -> List[Tuple]:
    """Rule 3: RX service lines < RX claims (impossible)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['num_service_lines_rx']) and pd.notna(row['num_unique_claims_rx']):
            if row['num_service_lines_rx'] < row['num_unique_claims_rx']:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_3',
                    'high',
                    ['num_service_lines_rx', 'num_unique_claims_rx'],
                    f"service lines ({int(row['num_service_lines_rx'])}) < claims ({int(row['num_unique_claims_rx'])})"
                ))

    return violations


def rule_4_med_incentive_exceeds_pay(df: pd.DataFrame) -> List[Tuple]:
    """Rule 4: Medical incentive > medical plan pay (overpayment)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['total_garner_incentive_paid_medical']) and pd.notna(row['total_plan_pay_medical']):
            if row['total_garner_incentive_paid_medical'] > row['total_plan_pay_medical']:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_4',
                    'high',
                    ['total_garner_incentive_paid_medical', 'total_plan_pay_medical'],
                    f"incentive (${row['total_garner_incentive_paid_medical']}) > payment (${row['total_plan_pay_medical']})"
                ))

    return violations


def rule_5_rx_incentive_exceeds_pay(df: pd.DataFrame) -> List[Tuple]:
    """Rule 5: RX incentive > RX plan pay (overpayment)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['total_garner_incentive_paid_rx']) and pd.notna(row['total_plan_pay_rx']):
            if row['total_garner_incentive_paid_rx'] > row['total_plan_pay_rx']:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_5',
                    'high',
                    ['total_garner_incentive_paid_rx', 'total_plan_pay_rx'],
                    f"incentive (${row['total_garner_incentive_paid_rx']}) > payment (${row['total_plan_pay_rx']})"
                ))

    return violations


def rule_6_med_claims_no_pay(df: pd.DataFrame) -> List[Tuple]:
    """Rule 6a: Medical claims exist but no payment (orphaned claims)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['num_unique_claims_medical']) and row['num_unique_claims_medical'] > 0:
            if pd.isna(row['total_plan_pay_medical']) or row['total_plan_pay_medical'] <= 0:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_6a',
                    'medium',
                    ['num_unique_claims_medical', 'total_plan_pay_medical'],
                    f"{int(row['num_unique_claims_medical'])} medical claims but payment is {row['total_plan_pay_medical']}"
                ))

    return violations


def rule_6b_rx_claims_no_pay(df: pd.DataFrame) -> List[Tuple]:
    """Rule 6b: RX claims exist but no payment (orphaned claims)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['num_unique_claims_rx']) and row['num_unique_claims_rx'] > 0:
            if pd.isna(row['total_plan_pay_rx']) or row['total_plan_pay_rx'] <= 0:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_6b',
                    'medium',
                    ['num_unique_claims_rx', 'total_plan_pay_rx'],
                    f"{int(row['num_unique_claims_rx'])} RX claims but payment is {row['total_plan_pay_rx']}"
                ))

    return violations


def rule_7a_med_lines_no_claims(df: pd.DataFrame) -> List[Tuple]:
    """Rule 7a: Medical service lines exist but no claims (orphaned lines)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['num_service_lines_medical']) and row['num_service_lines_medical'] > 0:
            if pd.isna(row['num_unique_claims_medical']) or row['num_unique_claims_medical'] == 0:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_7a',
                    'medium',
                    ['num_service_lines_medical', 'num_unique_claims_medical'],
                    f"{int(row['num_service_lines_medical'])} medical service lines but no claims"
                ))

    return violations


def rule_7b_rx_lines_no_claims(df: pd.DataFrame) -> List[Tuple]:
    """Rule 7b: RX service lines exist but no claims (orphaned lines)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['num_service_lines_rx']) and row['num_service_lines_rx'] > 0:
            if pd.isna(row['num_unique_claims_rx']) or row['num_unique_claims_rx'] == 0:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_7b',
                    'medium',
                    ['num_service_lines_rx', 'num_unique_claims_rx'],
                    f"{int(row['num_service_lines_rx'])} RX service lines but no claims"
                ))

    return violations


def rule_8_activity_no_members(df: pd.DataFrame) -> List[Tuple]:
    """Rule 8: Activity exists but no members (impossible)"""
    violations = []
    activity_cols = [
        'num_unique_claims_medical', 'num_unique_claims_rx',
        'num_service_lines_medical', 'num_service_lines_rx',
        'total_plan_pay_medical', 'total_plan_pay_rx'
    ]

    for idx, row in df.iterrows():
        members = row['count_eligible_primary_members']
        if pd.isna(members) or members <= 0:
            bad_cols = []
            for col in activity_cols:
                if pd.notna(row[col]) and row[col] > 0:
                    bad_cols.append(col)

            if bad_cols:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_8',
                    'high',
                    bad_cols,
                    f"members={members} but activity in: {', '.join(bad_cols)}"
                ))

    return violations


def rule_13_missing_data(df: pd.DataFrame) -> List[Tuple]:
    """Rule 13: Missing critical fields (NaN/null in required columns)"""
    violations = []
    critical_cols = [
        'client_id', 'client_name', 'service_month',
        'count_eligible_primary_members',
        'total_plan_pay_medical', 'total_plan_pay_rx'
    ]

    for idx, row in df.iterrows():
        missing_cols = [col for col in critical_cols if pd.isna(row[col])]

        if missing_cols:
            violations.append((
                row.get('client_name', 'UNKNOWN'),
                row['service_month'].strftime('%Y-%m-%d') if hasattr(row.get('service_month'), 'strftime') else str(row.get('service_month', 'UNKNOWN')),
                'rule_13',
                'high',
                missing_cols,
                f"missing: {', '.join(missing_cols)}"
            ))

    return violations


def rule_10_claims_per_member_spike(df: pd.DataFrame) -> List[Tuple]:
    """Rule 10: Claims per member unusually high (> 50 claims per member)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['count_eligible_primary_members']) and row['count_eligible_primary_members'] > 0:
            if pd.notna(row['num_unique_claims_medical']):
                ratio = row['num_unique_claims_medical'] / row['count_eligible_primary_members']
                if ratio > 50:
                    violations.append((
                        row['client_name'],
                        row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                        'rule_10',
                        'medium',
                        ['num_unique_claims_medical', 'count_eligible_primary_members'],
                        f"{ratio:.1f} medical claims per member (threshold: 50)"
                    ))

    return violations


def rule_11_service_lines_per_claim_spike(df: pd.DataFrame) -> List[Tuple]:
    """Rule 11: Service lines per claim unusually high (> 50 lines per claim)"""
    violations = []

    for idx, row in df.iterrows():
        if pd.notna(row['num_unique_claims_medical']) and row['num_unique_claims_medical'] > 0:
            if pd.notna(row['num_service_lines_medical']):
                ratio = row['num_service_lines_medical'] / row['num_unique_claims_medical']
                if ratio > 50:
                    violations.append((
                        row['client_name'],
                        row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                        'rule_11',
                        'low',
                        ['num_service_lines_medical', 'num_unique_claims_medical'],
                        f"{ratio:.1f} medical service lines per claim (threshold: 50)"
                    ))

    return violations


def rule_12_rx_med_ratio_extreme(df: pd.DataFrame) -> List[Tuple]:
    """Rule 12: RX/Medical ratio extreme (one is 10x+ the other)"""
    violations = []

    for idx, row in df.iterrows():
        med = row.get('num_unique_claims_medical', 0) or 0
        rx = row.get('num_unique_claims_rx', 0) or 0

        if med > 0 and rx > 0:
            ratio = rx / med if med > 0 else 0
            if ratio > 10 or ratio < 0.1:
                violations.append((
                    row['client_name'],
                    row['service_month'].strftime('%Y-%m-%d') if hasattr(row['service_month'], 'strftime') else str(row['service_month']),
                    'rule_12',
                    'low',
                    ['num_unique_claims_medical', 'num_unique_claims_rx'],
                    f"RX/Med ratio {ratio:.2f} (extreme: >10 or <0.1)"
                ))

    return violations


def detect_anomalies(df: pd.DataFrame, previous_anomalies: pd.DataFrame = None) -> List[Dict]:
    """
    Detect all anomalies in claims data using 20 rules

    Args:
        df: Current claims DataFrame (must include client_id, client_name)
        previous_anomalies: Previous week's anomalies for comparison (optional)

    Returns:
        List of anomalies in format ready for database insert
    """

    # Run all rules
    all_violations = []
    all_violations.extend(rule_1_negative_values(df))
    all_violations.extend(rule_2_med_lines_less_claims(df))
    all_violations.extend(rule_3_rx_lines_less_claims(df))
    all_violations.extend(rule_4_med_incentive_exceeds_pay(df))
    all_violations.extend(rule_5_rx_incentive_exceeds_pay(df))
    all_violations.extend(rule_6_med_claims_no_pay(df))
    all_violations.extend(rule_6b_rx_claims_no_pay(df))
    all_violations.extend(rule_7a_med_lines_no_claims(df))
    all_violations.extend(rule_7b_rx_lines_no_claims(df))
    all_violations.extend(rule_8_activity_no_members(df))
    all_violations.extend(rule_13_missing_data(df))
    all_violations.extend(rule_10_claims_per_member_spike(df))
    all_violations.extend(rule_11_service_lines_per_claim_spike(df))
    all_violations.extend(rule_12_rx_med_ratio_extreme(df))

    # Create mapping of client_name to client_id for lookups
    client_id_map = df[['client_name', 'client_id']].drop_duplicates().set_index('client_name')['client_id'].to_dict()

    # Convert to dictionary format for output
    anomalies = []
    for client_name, service_month, rule, confidence, metrics, notes in all_violations:
        anomalies.append({
            'client_id': int(client_id_map.get(client_name, 0)),
            'client_name': client_name,
            'service_month': service_month,
            'rule_violated': rule,
            'affected_metrics': ','.join(metrics) if isinstance(metrics, list) else metrics,
            'confidence': confidence,
            'notes': notes
        })

    return anomalies


def main():
    """CLI entry point for detect.sh"""
    import sys
    import csv

    if len(sys.argv) < 2:
        print("Usage: python anomaly_rules.py <claims_csv_file>")
        sys.exit(1)

    csv_file = sys.argv[1]

    try:
        # Read CSV
        df = pd.read_csv(csv_file)

        # Detect anomalies
        anomalies = detect_anomalies(df)

        # Write to stdout as CSV
        fieldnames = ['client_name', 'service_month', 'rule_violated', 'affected_metrics', 'confidence', 'notes']
        writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames)
        writer.writeheader()

        if anomalies:
            writer.writerows(anomalies)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
