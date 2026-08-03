'use client'

import { useEffect } from 'react'

export default function AnomaliesPage() {
  useEffect(() => {
    window.location.href = '/projects/claims-anomaly/anomalies-grouped'
  }, [])

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p>Redirecting to anomalies view...</p>
    </div>
  )
}
