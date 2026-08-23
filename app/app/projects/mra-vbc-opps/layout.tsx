'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface JWTPayload {
  email: string
  role: string
  exp: number
}

export default function MraVbcOppsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<JWTPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const decoded = JSON.parse(atob(parts[1]))
          setUser(decoded)
        }
      } catch (err) {
        console.error('Failed to decode token:', err)
      }
    } else {
      setUser(null)
    }
    setLoading(false)
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/projects/mra-vbc-opps/auth/login')
  }

  const isLoginPage = pathname === '/projects/mra-vbc-opps/auth/login'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      {!isLoginPage && (
        <div style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd', padding: '16px 40px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                <Link href="/projects/mra-vbc-opps" style={{ color: '#333', textDecoration: 'none' }}>
                  MRA VBC Opportunities
                </Link>
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {user && !loading && (
                <div style={{ fontSize: '13px', color: '#666' }}>
                  <span style={{ fontWeight: '500' }}>{user.email}</span>
                  <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: '#e0e0e0', borderRadius: '3px', fontSize: '11px' }}>
                    {user.role}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
}
