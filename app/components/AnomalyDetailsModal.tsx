'use client'

import { useState, useEffect } from 'react'
import { getApiUrl } from '@/utils/api'
import styles from '@/app/app/projects/claims-anomaly/claims-anomaly.module.css'

interface Rule {
  id: string
  rule: string
  confidence: string
  affected_metrics: string
  notes: string
  status: string
}

interface AnomalyGroup {
  client_id: number
  client_name: string
  service_month: string
  rule_count: number
  max_confidence: string
  rules_violated: Rule[]
  last_seen_at: string
  review_status: string | null
  review_feedback: string
}

interface Props {
  group: AnomalyGroup
  onClose: () => void
}

export default function AnomalyDetailsModal({ group, onClose }: Props) {
  const [reviewStatus, setReviewStatus] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [claimsRecord, setClaimsRecord] = useState<any>(null)
  const [loadingClaims, setLoadingClaims] = useState(true)

  useEffect(() => {
    fetchClaimsRecord()
    fetchReview()
  }, [group])

  const fetchReview = async () => {
    try {
      const response = await fetch(
        `${getApiUrl()}/api/claims-anomaly/client-month-review/${group.client_id}/${group.service_month}`
      )
      if (response.ok) {
        const data = await response.json()
        setReviewStatus(data.status || null)
        setFeedback(data.feedback || '')
      }
    } catch (err) {
      console.error('Failed to fetch review:', err)
    }
  }

  const fetchClaimsRecord = async () => {
    try {
      setLoadingClaims(true)
      const response = await fetch(
        `${getApiUrl()}/api/claims-anomaly/claims?limit=1&offset=0&filter_client_id=${group.client_id}&filter_service_month=${group.service_month}`
      )
      if (response.ok) {
        const data = await response.json()
        setClaimsRecord(data.claims?.[0] || null)
      }
    } catch (err) {
      console.error('Failed to fetch claims record:', err)
    } finally {
      setLoadingClaims(false)
    }
  }


  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high':
        return '#dc2626'
      case 'medium':
        return '#f59e0b'
      case 'low':
        return '#3b82f6'
      default:
        return '#6b7280'
    }
  }

  const handleSaveReview = async () => {
    setSaving(true)
    try {
      const response = await fetch(
        `${getApiUrl()}/api/claims-anomaly/client-month-review/${group.client_id}/${group.service_month}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: reviewStatus,
            feedback: feedback
          })
        }
      )

      if (response.ok) {
        setMessage('✅ Review saved successfully')
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        setMessage('❌ Failed to save review')
      }
    } catch (err) {
      console.error('Error saving review:', err)
      setMessage('❌ Error saving review')
    } finally {
      setSaving(false)
    }
  }


  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '30px'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '25px' }}>
          <button
            onClick={onClose}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>

          <h2 style={{ color: '#1f2937', marginBottom: '10px', marginTop: 0 }}>
            Anomaly Details
          </h2>
          <p style={{ color: '#6b7280', margin: '5px 0' }}>
            <strong>Client:</strong> {group.client_name} (ID: {group.client_id})
          </p>
          <p style={{ color: '#6b7280', margin: '5px 0' }}>
            <strong>Service Month:</strong> {group.service_month}
          </p>
          <p style={{ color: '#6b7280', margin: '5px 0' }}>
            <strong>Rules Violated:</strong> {group.rule_count}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '6px',
            backgroundColor: message.startsWith('✅') ? '#dcfce7' : '#fee2e2',
            color: message.startsWith('✅') ? '#166534' : '#991b1b',
            fontSize: '0.9rem'
          }}>
            {message}
          </div>
        )}

        {/* Claims Record */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#374151', marginBottom: '12px' }}>Claims Record:</h3>
          {loadingClaims ? (
            <p style={{ color: '#6b7280' }}>Loading claims data...</p>
          ) : claimsRecord ? (
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '15px',
              fontSize: '0.9rem',
              color: '#1e40af'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <strong>Members:</strong> {claimsRecord.count_eligible_primary_members}
                </div>
                <div>
                  <strong>Medical Claims:</strong> {claimsRecord.num_unique_claims_medical}
                </div>
                <div>
                  <strong>RX Claims:</strong> {claimsRecord.num_unique_claims_rx}
                </div>
                <div>
                  <strong>Medical Service Lines:</strong> {claimsRecord.num_service_lines_medical}
                </div>
                <div>
                  <strong>RX Service Lines:</strong> {claimsRecord.num_service_lines_rx}
                </div>
                <div>
                  <strong>Medical Plan Pay:</strong> ${claimsRecord.total_plan_pay_medical ?? 'N/A'}
                </div>
                <div>
                  <strong>RX Plan Pay:</strong> ${claimsRecord.total_plan_pay_rx ?? 'N/A'}
                </div>
                <div>
                  <strong>Medical Incentive:</strong> ${claimsRecord.total_garner_incentive_paid_medical ?? 'N/A'}
                </div>
                <div>
                  <strong>RX Incentive:</strong> ${claimsRecord.total_garner_incentive_paid_rx ?? 'N/A'}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>No claims record found</p>
          )}
        </div>

        {/* Rules List */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#374151', marginBottom: '15px' }}>Rules Violated:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {group.rules_violated.map((rule) => (
              <div
                key={rule.id}
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '15px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#1f2937', fontSize: '1rem' }}>{rule.rule}</strong>
                    <p style={{ color: '#6b7280', margin: '5px 0 0 0', fontSize: '0.9rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {rule.notes}
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: getConfidenceColor(rule.confidence),
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      marginLeft: '10px'
                    }}
                  >
                    {rule.confidence.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '10px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  <strong>Affected Metrics:</strong> {rule.affected_metrics.split(',').map((m, i) => <div key={i} style={{ marginLeft: '20px', marginTop: '4px' }}>{m.trim()}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Section */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#374151', marginBottom: '15px' }}>Review Status:</h3>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="review-status" style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
              Status:
            </label>
            <select
              id="review-status"
              value={reviewStatus || ''}
              onChange={(e) => setReviewStatus(e.target.value || null)}
              disabled={saving}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                backgroundColor: 'white',
                color: '#374151',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Not Reviewed</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>

          <div>
            <label htmlFor="feedback" style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
              Feedback:
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={saving}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
              placeholder="Add feedback or notes about this anomaly group..."
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            Close
          </button>
          <button
            onClick={handleSaveReview}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            {saving ? 'Saving...' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
