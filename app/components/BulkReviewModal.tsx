'use client'

import { useState } from 'react'
import { getApiUrl } from '@/utils/api'

interface AnomalyGroup {
  client_id: number
  client_name: string
  service_month: string
}

interface Props {
  selectedCount: number
  groups: AnomalyGroup[]
  onClose: () => void
}

export default function BulkReviewModal({ selectedCount, groups, onClose }: Props) {
  const [reviewStatus, setReviewStatus] = useState<string>('reviewed')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSaveBulkReview = async () => {
    if (!feedback.trim()) {
      setMessage('❌ Please enter feedback')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        `${getApiUrl()}/claims-anomaly/bulk-client-month-reviews`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groups: groups.map(g => ({
              client_id: g.client_id,
              service_month: g.service_month
            })),
            status: reviewStatus,
            feedback: feedback
          })
        }
      )

      if (response.ok) {
        setMessage('✅ Reviews saved successfully')
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        setMessage('❌ Failed to save reviews')
      }
    } catch (err) {
      console.error('Error saving bulk reviews:', err)
      setMessage('❌ Error saving reviews')
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
          maxWidth: '600px',
          width: '100%',
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
            Bulk Review
          </h2>
          <p style={{ color: '#6b7280', margin: '5px 0' }}>
            Reviewing <strong>{selectedCount} anomaly group{selectedCount > 1 ? 's' : ''}</strong>
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

        {/* Selected Groups List */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#374151', marginBottom: '12px' }}>Selected Groups:</h3>
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {groups.map((g) => (
              <div
                key={`${g.client_id}-${g.service_month}`}
                style={{
                  padding: '8px',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '0.9rem',
                  color: '#374151'
                }}
              >
                <strong>{g.client_name}</strong> (ID: {g.client_id}) • {g.service_month}
              </div>
            ))}
          </div>
        </div>

        {/* Review Section */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#374151', marginBottom: '15px' }}>Review Details:</h3>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="bulk-status" style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
              Status:
            </label>
            <select
              id="bulk-status"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
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
            <label htmlFor="bulk-feedback" style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 500 }}>
              Feedback (same for all):
            </label>
            <textarea
              id="bulk-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={saving}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
              placeholder="Add feedback that will be applied to all selected groups..."
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
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveBulkReview}
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
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : `Review All ${selectedCount}`}
          </button>
        </div>
      </div>
    </div>
  )
}
