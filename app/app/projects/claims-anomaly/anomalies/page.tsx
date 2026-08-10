'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AnomaliesPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/projects/claims-anomaly/anomalies-grouped')
  }, [router])

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p>Redirecting to anomalies view...</p>
    </div>
  )
}
