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
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const role = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const decoded = JSON.parse(atob(parts[1]))
          setUser(decoded)
          setUserRole(role)
        }
      } catch (err) {
        console.error('Failed to decode token:', err)
      }
    } else {
      setUser(null)
      setUserRole(null)
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

      {/* Get Started Navigation */}
      {!isLoginPage && pathname !== '/projects/mra-vbc-opps' && (
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd', padding: '20px 40px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '16px' }}>
            <Link href="/projects/mra-vbc-opps" style={{ padding: '12px 24px', backgroundColor: '#0070f3', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>
              Home
            </Link>
            <Link href="/projects/mra-vbc-opps/upload" style={{ padding: '12px 24px', backgroundColor: '#0070f3', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>
              Upload CSV
            </Link>
            <Link href="/projects/mra-vbc-opps/work-queue" style={{ padding: '12px 24px', backgroundColor: '#0070f3', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>
              Work Queue
            </Link>
            {userRole === 'Admin' && (
              <Link href="/projects/mra-vbc-opps/admin/users" style={{ padding: '12px 24px', backgroundColor: '#666', color: 'white', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>
                Admin Dashboard
              </Link>
            )}
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
