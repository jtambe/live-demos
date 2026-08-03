#!/bin/bash

# detect.sh - Standalone CLI for anomaly detection
# Usage: ./detect.sh <claims_csv_file> [output_csv]
# Outputs anomalies to stdout or optional output file

set -e

if [ $# -lt 1 ]; then
    echo "Usage: ./detect.sh <claims_csv_file> [output_csv]"
    echo ""
    echo "Examples:"
    echo "  ./detect.sh claims.csv                    # Output to stdout"
    echo "  ./detect.sh claims.csv anomalies.csv      # Output to file"
    exit 1
fi

INPUT_CSV="$1"
OUTPUT_CSV="${2:-}"

# Verify input file exists
if [ ! -f "$INPUT_CSV" ]; then
    echo "Error: Input file not found: $INPUT_CSV" >&2
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate virtual environment if it exists
if [ -f "$SCRIPT_DIR/api/venv/bin/activate" ]; then
    source "$SCRIPT_DIR/api/venv/bin/activate"
    PYTHON_CMD="python"
else
    PYTHON_CMD="python3"
fi

# Run the Python anomaly detection
if [ -z "$OUTPUT_CSV" ]; then
    # Output to stdout
    $PYTHON_CMD "$SCRIPT_DIR/api/services/anomaly_rules.py" "$INPUT_CSV"
else
    # Output to file
    $PYTHON_CMD "$SCRIPT_DIR/api/services/anomaly_rules.py" "$INPUT_CSV" > "$OUTPUT_CSV"
    echo "Anomalies written to: $OUTPUT_CSV" >&2
fi
