'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProjectsPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/projects/claims-anomaly/upload')
  }, [router])

  return null
}
