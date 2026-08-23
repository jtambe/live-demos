'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '@/utils/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/mra-vbc-opps/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Login failed')
        return
      }

      // Store token
      localStorage.setItem('token', data.token)
      localStorage.setItem('user_role', data.user.role)
      localStorage.setItem('user_email', data.user.email)

      // Redirect based on role
      if (data.user.role === 'Admin') {
        router.push('/projects/mra-vbc-opps/admin/users')
      } else {
        router.push('/projects/mra-vbc-opps')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h1 style={{ marginTop: '0', textAlign: 'center' }}>MRA VBC Opps</h1>
        <p style={{ textAlign: 'center', color: '#666' }}>Medical Record Abstraction Platform</p>

        <form onSubmit={handleLogin} style={{ marginTop: '40px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '16px',
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '16px',
              }}
              required
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: '#fee',
                border: '1px solid #f88',
                borderRadius: '4px',
                color: '#c00',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '40px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
          <p style={{ marginTop: '0' }}>Demo Credentials (click to fill):</p>
          <p style={{ marginBottom: '8px', cursor: 'pointer' }} onClick={() => { setEmail('admin1@vbc.com'); }}>
            <strong style={{ color: '#0070f3' }}>Admin:</strong> admin1@vbc.com
          </p>
          <p style={{ marginBottom: '0', cursor: 'pointer' }} onClick={() => { setEmail('user1@vbc.com');}}>
            <strong style={{ color: '#0070f3' }}>Coder:</strong> user1@vbc.com
          </p>
        </div>
      </div>
    </div>
  )
}
