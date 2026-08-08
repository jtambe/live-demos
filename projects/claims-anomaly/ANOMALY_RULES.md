# Claims Anomaly Detection Rules

Complete reference for all 20 anomaly detection rules implemented in `/api/services/anomaly_rules.py`.

## Rule Categories

### Hard Rules (1-13): Financial & Data Quality Constraints

These rules detect logically impossible or suspicious data patterns in individual records.

#### Rule 1: Negative Values
**Category:** Data Quality  
**Severity:** High  
**Trigger:** Any numeric field is negative

**Fields checked:**
- total_plan_pay_medical
- total_plan_pay_rx
- total_garner_incentive_paid_medical
- total_garner_incentive_paid_rx
- count_eligible_primary_members
- num_unique_claims_medical
- num_unique_claims_rx
- num_service_lines_medical
- num_service_lines_rx

**Example:** Medical plan pay = -$5,000 (impossible)

---

#### Rule 2: Medical Service Lines < Medical Claims
**Category:** Logical Constraint  
**Severity:** High  
**Trigger:** num_service_lines_medical < num_unique_claims_medical

**Rationale:** Each claim must have at least one service line. Claims cannot outnumber service lines.

**Example:** 5 medical claims but only 3 service lines

---

#### Rule 3: RX Service Lines < RX Claims
**Category:** Logical Constraint  
**Severity:** High  
**Trigger:** num_service_lines_rx < num_unique_claims_rx

**Rationale:** Same as Rule 2, applies to prescriptions

---

#### Rule 4: Medical Incentive > Medical Plan Pay
**Category:** Financial Consistency  
**Severity:** High  
**Trigger:** total_garner_incentive_paid_medical > total_plan_pay_medical

**Rationale:** Incentive paid cannot exceed actual plan payments (indicates data recording error or overpayment)

**Example:** Paid $20,000 in incentives but only $15,000 in plan payments

---

#### Rule 5: RX Incentive > RX Plan Pay
**Category:** Financial Consistency  
**Severity:** High  
**Trigger:** total_garner_incentive_paid_rx > total_plan_pay_rx

**Rationale:** Same as Rule 4, applies to prescriptions

---

#### Rule 6a: Medical Claims Without Payment
**Category:** Orphaned Data  
**Severity:** Medium  
**Trigger:** num_unique_claims_medical > 0 AND (total_plan_pay_medical ≤ 0 OR NULL)

**Rationale:** Claims processed but no corresponding payment recorded (potential processing error)

**Example:** 150 medical claims submitted, but payment amount is $0

---

#### Rule 6b: RX Claims Without Payment
**Category:** Orphaned Data  
**Severity:** Medium  
**Trigger:** num_unique_claims_rx > 0 AND (total_plan_pay_rx ≤ 0 OR NULL)

**Rationale:** Same as Rule 6a, applies to prescriptions

---

#### Rule 7a: Medical Service Lines Without Claims
**Category:** Orphaned Data  
**Severity:** Medium  
**Trigger:** num_service_lines_medical > 0 AND (num_unique_claims_medical = 0 OR NULL)

**Rationale:** Service lines recorded but no associated claims (data orphan)

**Example:** 500 service lines but 0 claims

---

#### Rule 7b: RX Service Lines Without Claims
**Category:** Orphaned Data  
**Severity:** Medium  
**Trigger:** num_service_lines_rx > 0 AND (num_unique_claims_rx = 0 OR NULL)

**Rationale:** Same as Rule 7a, applies to prescriptions

---

#### Rule 8: Activity Exists But No Members
**Category:** Logical Constraint  
**Severity:** High  
**Trigger:** (count_eligible_primary_members ≤ 0 OR NULL) AND any activity exists

**Activity fields:**
- num_unique_claims_medical
- num_unique_claims_rx
- num_service_lines_medical
- num_service_lines_rx
- total_plan_pay_medical
- total_plan_pay_rx

**Rationale:** Cannot have claims/payments with zero or undefined members

**Example:** 0 members but 100 medical claims

---

#### Rule 13: Missing Critical Fields
**Category:** Data Completeness  
**Severity:** High  
**Trigger:** Any critical field is NULL/NaN

**Critical fields:**
- client_id
- client_name
- service_month
- count_eligible_primary_members
- total_plan_pay_medical
- total_plan_pay_rx

**Rationale:** Required fields must have values for meaningful analysis

---

#### Rule 10: Claims Per Member Spike
**Category:** Threshold Anomaly  
**Severity:** Medium  
**Trigger:** (num_unique_claims_medical / count_eligible_primary_members) > 50

**Threshold:** 50 claims per eligible member  
**Example:** 100 members but 10,000 medical claims (100 claims/member)

**Interpretation:** Unusually high claim volume relative to population (potential data error or unusual care pattern)

---

#### Rule 11: Service Lines Per Claim Spike
**Category:** Threshold Anomaly  
**Severity:** Low  
**Trigger:** (num_service_lines_medical / num_unique_claims_medical) > 50

**Threshold:** 50 service lines per claim  
**Example:** 100 claims but 15,000 service lines (150 lines/claim)

**Interpretation:** Unusually complex claims with many service lines each (may be legitimate complex cases or data issue)

---

#### Rule 12: RX/Medical Claims Ratio Extreme
**Category:** Aggregation Anomaly  
**Severity:** Low  
**Trigger:** (num_unique_claims_rx / num_unique_claims_medical) > 10 OR < 0.1

**Thresholds:**
- RX > Medical × 10 (10-to-1 ratio)
- Medical > RX × 10 (10-to-1 ratio)

**Example 1:** 50 medical claims but 1,000 RX claims (20:1 ratio)  
**Example 2:** 1,000 medical claims but 10 RX claims (1:100 ratio)

**Interpretation:** Highly unusual medication-to-medical care balance for typical populations

---

## Temporal Rules (14-20): Week-over-Week Tracking

*Note: These rules require comparison against previous analysis results. Currently in planning phase for future implementation.*

- **Rule 14:** Anomaly Persistent - Same violation detected in consecutive weeks
- **Rule 15:** Anomaly New - Violation appeared this week, not in previous week
- **Rule 16:** Anomaly Resolved - Violation was in previous week, not this week
- **Rule 17:** Claims Trend Declining - Medical claims dropped >50% week-over-week
- **Rule 18:** Multiple Failures - Client+month combination triggers 3+ different rules
- **Rule 19:** Missing Update - Client appears in previous week but missing from current week
- **Rule 20:** Data Conflict - Same client+month has conflicting values between weeks

---

## Usage

### Via FastAPI Endpoint
```bash
# Upload CSV and trigger analysis
curl -X POST http://localhost:8000/api/claims-anomaly/upload \
  -F "file=@claims.csv"

# Get detected anomalies
curl http://localhost:8000/api/claims-anomaly/anomalies
```

### Via CLI (detect.sh)
```bash
# Output to stdout
./detect.sh claims.csv

# Output to file
./detect.sh claims.csv anomalies.csv
```

### Programmatically
```python
import pandas as pd
from api.services.anomaly_rules import detect_anomalies

df = pd.read_csv('claims.csv')
anomalies = detect_anomalies(df)

for anomaly in anomalies:
    print(f"{anomaly['client_name']}: {anomaly['notes']}")
```

---

## Output Format

All rules return anomalies in this standard format:

```python
{
    'client_name': str,           # e.g., "Blue Cross"
    'service_month': str,         # YYYY-MM-DD format
    'affected_metrics': str,      # Comma-separated column names
    'confidence': str,            # 'low', 'medium', or 'high'
    'notes': str                  # Human-readable explanation
}
```

**Confidence Levels:**
- **high:** Rules 1-9, 13 (data integrity/logical impossibilities)
- **medium:** Rules 6a/6b, 7a/7b, 10 (suspicious but possible patterns)
- **low:** Rules 11, 12 (statistical anomalies, not hard constraints)

---

## Rule Design Philosophy

1. **No False Negatives on Hard Constraints:** Rules 1-9, 13 catch logical impossibilities
2. **Threshold-Based for Patterns:** Rules 10-12 use conservative thresholds to flag unusual distributions
3. **Separated Rules for Clarity:** Rules 6a/6b, 7a/7b kept separate so reviewers see exact problem dimension
4. **Focused Notes:** Each note describes the specific violation with metrics (not generic messages)

---

## Performance

- **Analysis speed:** ~<5 seconds for 7,200 claims records (200 clients × 36 months)
- **Scalability:** Rules use vectorized pandas operations, not row loops (Rule 1 processes all records in parallel)
- **Memory:** <100MB for typical claim datasets

---

## Testing

Run the anomaly detector on sample data:
```bash
./detect.sh sample_claims.csv sample_anomalies.csv
```

Test individual rules:
```python
from api.services.anomaly_rules import rule_1_negative_values
violations = rule_1_negative_values(df)
```

---

## Future Enhancements

- Rule 14-20 (temporal rules) for week-over-week comparison
- Rule severity adjustment based on client profile
- Custom rule definitions per organization
- Anomaly suppression list (expected outliers)
