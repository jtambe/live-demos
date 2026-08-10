'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClaimsAnomalyPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/projects/claims-anomaly/upload')
  }, [router])

  return <div style={{ padding: '40px', textAlign: 'center' }}><p>Loading...</p></div>
}
