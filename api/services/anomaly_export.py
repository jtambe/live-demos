"""
Anomaly Detection Export - CSV Output for detect.sh CLI

Outputs anomalies in export format (without rule_violated column).
Used by detect.sh to generate anomalies.csv from claims.csv
"""

import pandas as pd
import sys
import csv
from anomaly_rules import detect_anomalies


def main():
    """CLI entry point for detect.sh - Export anomalies to CSV"""

    if len(sys.argv) < 2:
        print("Usage: python anomaly_export.py <claims_csv_file>")
        sys.exit(1)

    csv_file = sys.argv[1]

    try:
        # Read CSV
        df = pd.read_csv(csv_file)

        # Detect anomalies
        anomalies = detect_anomalies(df)

        # Group by (client_name, service_month) - one row per group
        grouped = {}
        for anomaly in anomalies:
            key = (anomaly['client_name'], anomaly['service_month'])
            if key not in grouped:
                grouped[key] = {
                    'client_name': anomaly['client_name'],
                    'service_month': anomaly['service_month'],
                    'metrics': set(),
                    'confidences': set(),
                    'notes': []
                }

            # Aggregate metrics (deduplicated)
            metrics = anomaly['affected_metrics'].split(',') if isinstance(anomaly['affected_metrics'], str) else anomaly['affected_metrics']
            grouped[key]['metrics'].update(metrics)

            # Track confidence levels
            grouped[key]['confidences'].add(anomaly['confidence'])

            # Collect notes
            grouped[key]['notes'].append(anomaly['notes'])

        # Write to stdout as CSV (export format)
        # Columns: client_name, service_month, affected_metrics, confidence, notes
        fieldnames = ['client_name', 'service_month', 'affected_metrics', 'confidence', 'notes']
        writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames)
        writer.writeheader()

        # Output one row per (client_name, service_month) group
        for (client_name, service_month), group_data in sorted(grouped.items()):
            # Combine metrics (comma-separated, deduplicated)
            affected_metrics = ','.join(sorted(group_data['metrics']))

            # Use highest confidence level (high > medium > low)
            confidence_order = {'high': 3, 'medium': 2, 'low': 1}
            max_confidence = max(group_data['confidences'], key=lambda x: confidence_order.get(x, 0))

            # Combine notes (join with semicolon)
            combined_notes = ' | '.join(group_data['notes'])

            writer.writerow({
                'client_name': client_name,
                'service_month': service_month,
                'affected_metrics': affected_metrics,
                'confidence': max_confidence,
                'notes': combined_notes
            })

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
