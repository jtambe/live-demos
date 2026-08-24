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
          <a href="/projects/mra-vbc-opps/upload" style={{ padding: '12px 24px', backgroundColor: '#0070f3', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
            Upload CSV
          </a>
          <a href="/projects/mra-vbc-opps/work-queue" style={{ padding: '12px 24px', backgroundColor: '#0070f3', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
            Work Queue
          </a>
          {!loading && user?.role === 'Admin' && (
            <Link href="/projects/mra-vbc-opps/admin/users" style={{ padding: '12px 24px', backgroundColor: '#666', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
              Admin Dashboard
            </Link>
          )}
        </div>
      </section>

      <section style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e8f4f8', borderRadius: '8px', borderLeft: '4px solid #0070f3' }}>
        <h2 style={{ marginTop: 0 }}>Overview</h2>
        <p style={{ lineHeight: '1.6', color: '#333' }}>
          An MRA platform for managing Medicare Advantage (MA) risk adjustment coding opportunities. 
          Consolidates healthcare provider records, identifies chronic condition documentation gaps, and routes them to clinical reviewers for disposition and submission.
        </p>
      </section>

      <section style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Documentation & Diagrams</h2>
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <a href="https://github.com/jtambe/live-demos/blob/main/projects/mra-vbc-opps-raf/README.md" target="_blank" rel="noopener noreferrer" style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', textDecoration: 'none', color: '#0070f3' }}>
            <strong>📄 README.md</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', color: '#666' }}>Core requirements, real-world scenarios, and design decisions</p>
          </a>
          <a href="https://github.com/jtambe/live-demos/blob/main/projects/mra-vbc-opps-raf/tests.md" target="_blank" rel="noopener noreferrer" style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', textDecoration: 'none', color: '#0070f3' }}>
            <strong>✅ tests.md</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', color: '#666' }}>Testing instructions for Python and TypeScript</p>
          </a>
          <a href="https://github.com/jtambe/live-demos/blob/main/projects/mra-vbc-opps-raf/Database.md" target="_blank" rel="noopener noreferrer" style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', textDecoration: 'none', color: '#0070f3' }}>
            <strong>🗄️ Database Schema</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', color: '#666' }}>SQL migrations and table definitions</p>
          </a>
          <a href="https://miro.com/app/board/uXjVHvSWGuU=/?moveToWidget=3458764681535412731&cot=14" target="_blank" rel="noopener noreferrer" style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', textDecoration: 'none', color: '#0070f3' }}>
            <strong>🏗️ Architecture Diagram</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', color: '#666' }}>System design and component interactions</p>
          </a>
          <a href="https://miro.com/app/board/uXjVHvSWGuU=/?moveToWidget=3458764681536252520&cot=14" target="_blank" rel="noopener noreferrer" style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', textDecoration: 'none', color: '#0070f3' }}>
            <strong>📊 UML Diagram</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', color: '#666' }}>Data models and entity relationships</p>
          </a>
        </div>
      </section>
    </main>
  )
}
