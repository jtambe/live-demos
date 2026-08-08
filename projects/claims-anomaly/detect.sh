#!/bin/bash

# detect.sh - Standalone CLI for anomaly detection
# Usage: ./detect.sh <claims_csv_file> [output_csv]
# Outputs anomalies to stdout or saves to data/claims-anomaly/anomalies.csv

set -e

if [ $# -lt 1 ]; then
    echo "Usage: ./detect.sh <claims_csv_file>"
    echo ""
    echo "Examples:"
    echo "  ./detect.sh ../../data/claims-anomaly/claims_monthly.csv"
    echo "  ./detect.sh /absolute/path/to/claims.csv"
    echo ""
    echo "Output: Saves to ../../data/claims-anomaly/anomalies.csv"
    exit 1
fi

INPUT_CSV="$1"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default output to data/claims-anomaly/anomalies.csv
OUTPUT_CSV="$REPO_ROOT/data/claims-anomaly/anomalies.csv"

# Convert input file to absolute path if relative
if [[ "$INPUT_CSV" != /* ]]; then
    INPUT_CSV="$(cd "$(dirname "$INPUT_CSV")" && pwd)/$(basename "$INPUT_CSV")"
fi

# Verify input file exists
if [ ! -f "$INPUT_CSV" ]; then
    echo "Error: Input file not found: $INPUT_CSV" >&2
    exit 1
fi

# Verify output directory exists
if [ ! -d "$(dirname "$OUTPUT_CSV")" ]; then
    echo "Error: Output directory does not exist: $(dirname "$OUTPUT_CSV")" >&2
    exit 1
fi

# Activate virtual environment if it exists
if [ -f "$REPO_ROOT/api/venv/bin/activate" ]; then
    source "$REPO_ROOT/api/venv/bin/activate"
    PYTHON_CMD="python"
else
    PYTHON_CMD="python3"
fi

# Run the anomaly export and save to data/claims-anomaly/
cd "$REPO_ROOT/api" && $PYTHON_CMD -m services.claims_anomaly_services.anomaly_export "$INPUT_CSV" > "$OUTPUT_CSV"
echo "✅ Anomalies written to: $OUTPUT_CSV" >&2
