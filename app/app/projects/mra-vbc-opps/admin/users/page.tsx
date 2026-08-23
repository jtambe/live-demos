'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getApiUrl } from '@/utils/api'

interface User {
  id: number
  email: string
  role: string
  created_at: string
  providers: number[]
}

interface Provider {
  id: number
  name: string
  provider_group: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('Coder')
  const [creating, setCreating] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/projects/mra-vbc-opps/auth/login')
      return
    }
    loadData()
  }, [token, router])

  const loadData = async () => {
    try {
      setLoading(true)
      const usersRes = await fetch(`${getApiUrl()}/mra-vbc-opps/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const providersRes = await fetch(`${getApiUrl()}/mra-vbc-opps/auth/providers`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!usersRes.ok || !providersRes.ok) {
        router.push('/projects/mra-vbc-opps/auth/login')
        return
      }

      const usersData = await usersRes.json()
      setUsers(usersData.users || [])
      setProviders((await providersRes.json()).providers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/mra-vbc-opps/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.detail || 'Failed to create user')
        return
      }

      setNewEmail('')
      setNewPassword('')
      setNewRole('Coder')
      setShowCreateForm(false)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleAssignProvider = async (userId: number, providerId: number) => {
    try {
      const response = await fetch(`${getApiUrl()}/mra-vbc-opps/auth/users/${userId}/providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, provider_id: providerId }),
      })

      if (response.ok) {
        loadData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign provider')
    }
  }

  const handleRemoveProvider = async (userId: number, providerId: number) => {
    try {
      const response = await fetch(`${getApiUrl()}/mra-vbc-opps/auth/users/${userId}/providers/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        loadData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove provider')
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <Link href="/projects/mra-vbc-opps" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← Back to MRA VBC Opps
        </Link>
        <h1 style={{ margin: '20px 0 0 0' }}>User Management</h1>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#fee',
            border: '1px solid #f88',
            borderRadius: '4px',
            color: '#c00',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        style={{
          marginBottom: '20px',
          padding: '12px 24px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {showCreateForm ? 'Cancel' : 'Create New User'}
      </button>

      {showCreateForm && (
        <form
          onSubmit={handleCreateUser}
          style={{
            marginBottom: '40px',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Coder">Coder</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            style={{
              padding: '12px 24px',
              backgroundColor: creating ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: creating ? 'not-allowed' : 'pointer',
            }}
          >
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #ddd',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Role</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Assigned Providers</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px' }}>{user.email}</td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      backgroundColor: user.role === 'Admin' ? '#ffd700' : '#e0e0e0',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    {user.providers.map((pId) => {
                      const provider = providers.find((p) => p.id === pId)
                      return (
                        <div
                          key={pId}
                          style={{
                            display: 'inline-block',
                            marginRight: '8px',
                            marginBottom: '8px',
                            padding: '6px 12px',
                            backgroundColor: '#e0f0ff',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          {provider?.name} ({provider?.provider_group})
                          <button
                            onClick={() => handleRemoveProvider(user.id, pId)}
                            style={{
                              marginLeft: '8px',
                              background: 'none',
                              border: 'none',
                              color: '#f44',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <select
                    onChange={(e) => {
                      const pId = parseInt(e.target.value)
                      if (pId) {
                        handleAssignProvider(user.id, pId)
                        e.target.value = ''
                      }
                    }}
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <option value="">+ Add Provider</option>
                    {providers.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={user.providers.includes(p.id)}
                      >
                        {p.name} ({p.provider_group})
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '12px' }}>
                  <Link href="/projects/mra-vbc-opps" style={{ color: '#0070f3', textDecoration: 'none' }}>
                    View Work Queue
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
