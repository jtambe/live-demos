'use client'

import ClaimsNavigation from '@/components/ClaimsNavigation'
import styles from '../claims-anomaly.module.css'

const rules = [
  {
    id: 'rule_1',
    name: 'Negative Values',
    description: 'Financial and count data cannot be negative. Detects when any numeric field (payments, claims, service lines) contains negative values indicating data entry errors or system bugs.'
  },
  {
    id: 'rule_2',
    name: 'Medical Service Lines < Medical Claims',
    description: 'Medical service lines cannot be fewer than medical claims. A claim must have at least one service line. Indicates data inconsistency or orphaned records.'
  },
  {
    id: 'rule_3',
    name: 'RX Service Lines < RX Claims',
    description: 'RX service lines cannot be fewer than RX claims. Each claim requires at least one service line. Suggests data integrity issues.'
  },
  {
    id: 'rule_4',
    name: 'Medical Incentive > Medical Plan Pay',
    description: 'Incentive payments cannot exceed plan payments (overpayment). Indicates financial processing errors or unauthorized bonus payments that exceed contractual limits.'
  },
  {
    id: 'rule_5',
    name: 'RX Incentive > RX Plan Pay',
    description: 'RX incentive payments cannot exceed RX plan payments (overpayment). Suggests financial control breach where bonuses exceed actual claim payments.'
  },
  {
    id: 'rule_6a',
    name: 'Medical Claims Exist But No Payment',
    description: 'Medical claims are recorded but have no payment amount. Indicates orphaned claims not processed or payment system failures for medical services.'
  },
  {
    id: 'rule_6b',
    name: 'RX Claims Exist But No Payment',
    description: 'RX claims are recorded but have no payment amount. Suggests unprocessed pharmacy claims or payment processing gaps in the RX pipeline.'
  },
  {
    id: 'rule_7a',
    name: 'Medical Service Lines Exist But No Claims',
    description: 'Medical service lines are recorded but no claims reference them. Indicates orphaned service line records detached from parent claims (data cleanup needed).'
  },
  {
    id: 'rule_7b',
    name: 'RX Service Lines Exist But No Claims',
    description: 'RX service lines are recorded but no claims reference them. Suggests orphaned pharmacy service line records not linked to actual prescription claims.'
  },
  {
    id: 'rule_8',
    name: 'Activity Exists But No Members',
    description: 'Claims, payments, or service lines exist when member count is zero or missing. Impossible scenario indicating missing member data or orphaned activity records.'
  },
  {
    id: 'rule_10',
    name: 'Claims Per Member Unusually High',
    description: 'Medical claims per member exceeds 50 (threshold). Indicates potential over-utilization, data duplication, or outlier members with extraordinary claim volume.'
  },
  {
    id: 'rule_11',
    name: 'Service Lines Per Claim Unusually High',
    description: 'Medical service lines per claim exceeds 50 (threshold). Suggests complex claims with many line items or possible data entry errors creating excessive granularity.'
  },
  {
    id: 'rule_12',
    name: 'RX/Medical Ratio Extreme',
    description: 'RX to medical claim ratio is extreme (>10x or <0.1x). Indicates imbalanced claim distribution suggesting population mix changes or pharmacy data issues.'
  },
  {
    id: 'rule_13',
    name: 'Missing Critical Fields',
    description: 'Required fields (client ID, name, month, members, payments) are null or missing. Critical for data quality; prevents accurate analysis and reporting.'
  }
]

export default function RulesPage() {
  return (
    <main className={styles.container}>
      <h1>Claims Anomaly Detection - Rules</h1>

      <ClaimsNavigation activePage="rules" />

      <div className={styles.infoBox}>
        <p>
          <strong>📋 Anomaly Detection Rules Reference</strong><br />
          Read-only guide to all 14 rules used in anomaly detection. Rules are applied to claims data to identify inconsistencies, impossibilities, and outliers.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gap: '20px',
        gridTemplateColumns: '1fr'
      }}>
        {rules.map((rule) => (
          <div
            key={rule.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: '#f9fafb'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '12px'
            }}>
              <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem' }}>
                {rule.name}
              </h3>
              <span style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                marginLeft: '10px'
              }}>
                {rule.id}
              </span>
            </div>
            <p style={{
              margin: 0,
              color: '#4b5563',
              fontSize: '0.95rem',
              lineHeight: '1.5'
            }}>
              {rule.description}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
