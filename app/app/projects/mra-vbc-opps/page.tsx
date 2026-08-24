'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface JWTPayload {
  email: string
  role: string
  exp: number
}

export default function MraVbcOppsPage() {
  const router = useRouter()
  const [user, setUser] = useState<JWTPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null
    const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null

    if (!token) {
      router.push('/projects/mra-vbc-opps/auth/login')
    } else {
      // Use stored role and email from login
      if (storedEmail && storedRole) {
        setUser({
          email: storedEmail,
          role: storedRole,
          exp: 0
        })
      }
    }
    setLoading(false)
  }, [router])
  return (
    <main style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Medical Record Abstraction (MRA) — VBC Opportunities Platform</h1>

      <section style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Get Started</h2>
        <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
          <Link href="/projects/mra-vbc-opps/upload" style={{ padding: '12px 24px', backgroundColor: '#0070f3', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
            Upload CSV
          </Link>
          <Link href="/projects/mra-vbc-opps/work-queue" style={{ padding: '12px 24px', backgroundColor: '#0070f3', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
            Work Queue
          </Link>
          {!loading && user?.role === 'Admin' && (
            <Link href="/projects/mra-vbc-opps/admin/users" style={{ padding: '12px 24px', backgroundColor: '#666', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
              Admin Dashboard
            </Link>
          )}
        </div>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Overview</h2>
        <p>
          An MRA platform for managing Medicare Advantage (MA) risk adjustment coding opportunities.
          Consolidates healthcare provider records, identifies chronic condition documentation gaps,
          and routes them to clinical reviewers for disposition and submission.
        </p>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Core Capabilities</h2>
        <ul>
          <li><strong>C1 - Data Ingestion:</strong> Upload CSV files with member diagnoses, HCC mappings, and coding initiatives</li>
          <li><strong>C2 - Work Queue:</strong> Member-centric view of opportunities with filtering and pagination</li>
          <li><strong>C3 - Disposition Workflow:</strong> Coders record decisions (Confirmed/Denied/Pending/Referred) with justification</li>
          <li><strong>C4 - Auth & RBAC:</strong> Role-based access (Coder/Admin) with provider scoping</li>
        </ul>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Key Domain Concepts</h2>
        <ul>
          <li><strong>RAF Score:</strong> Risk Adjustment Factor driven by HCC codes; only HCC-mapped conditions drive revenue</li>
          <li><strong>Identity Resolution:</strong> Single member_id may have multiple policy_numbers across payers (dual-payer handling)</li>
          <li><strong>Year-over-Year Tracking:</strong> Same condition across PY2024/PY2025 files; latest source wins</li>
          <li><strong>Cross-Payer Conflicts:</strong> Same ICD-10 maps to different HCCs per payer; present both for team review</li>
          <li><strong>Non-HCC Records:</strong> Stored but excluded from work queue (no revenue impact)</li>
        </ul>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Design Decisions</h2>
        <ul>
          <li>Synchronous CSV ingestion (no background jobs on Vercel/Supabase free tier)</li>
          <li>Immutable disposition audit log; current state tracked separately</li>
          <li>Provider scoping enforced at query level for coders</li>
          <li>Version tracking via <code>is_current</code> flag for historical analysis</li>
        </ul>
      </section>

    </main>
  )
}
