'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getApiUrl } from '@/utils/api'

interface Opportunity {
  id: number
  member_id: number
  provider_id: number
  provider_name: string
  payer_id: number
  icd_10: string
  icd_10_description: string
  hcc_code: string
  hcc_description: string
  initiative: string
  disposition_status: string
  evidence: string
  last_dos: string
}

interface MemberGroup {
  member_id: string
  member_name: string
  opportunities: Opportunity[]
}

interface Provider {
  id: number
  name: string
}

export default function WorkQueuePage() {
  const router = useRouter()
  const [memberGroups, setMemberGroups] = useState<Record<number, MemberGroup>>({})
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set())

  // Filters
  const [searchMemberName, setSearchMemberName] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null)
  const [selectedInitiative, setSelectedInitiative] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/projects/mra-vbc-opps/auth/login')
      return
    }
    loadProviders()
  }, [token, router])

  useEffect(() => {
    loadWorkQueue()
  }, [selectedProvider, selectedInitiative, selectedStatus, limit, offset, token])

  const loadProviders = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/mra-vbc-opps/auth/providers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers || [])
      }
    } catch (err) {
      console.error('Failed to load providers:', err)
    }
  }

  const loadWorkQueue = async () => {
    if (!token) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (searchMemberName) params.append('search_member_name', searchMemberName)
      if (selectedProvider) params.append('provider_id', selectedProvider.toString())
      if (selectedInitiative) params.append('initiative', selectedInitiative)
      if (selectedStatus) params.append('disposition_status', selectedStatus)
      params.append('limit', limit.toString())
      params.append('offset', offset.toString())

      const res = await fetch(`${getApiUrl()}/mra-vbc-opps/opportunities/work-queue?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        setError('Failed to load work queue')
        return
      }

      const data = await res.json()
      setMemberGroups(data.members || {})
      setTotalCount(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work queue')
    } finally {
      setLoading(false)
    }
  }

  const toggleMemberExpand = (memberId: number) => {
    const newExpanded = new Set(expandedMembers)
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId)
    } else {
      newExpanded.add(memberId)
    }
    setExpandedMembers(newExpanded)
  }

  const handleClearFilters = () => {
    setSelectedProvider(null)
    setSelectedInitiative('')
    setSelectedStatus('')
    setSearchMemberName('')
    setOffset(0)
  }

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(totalCount / limit)
  const memberIds = Object.keys(memberGroups).map(Number)
  const memberCount = memberIds.length
  const opportunityCount = memberIds.reduce((sum, mid) => sum + (memberGroups[mid]?.opportunities.length || 0), 0)

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <Link href="/projects/mra-vbc-opps" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← Back to MRA VBC Opps
        </Link>
        <h1 style={{ margin: '20px 0 0 0' }}>Work Queue</h1>
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

      {/* Filters */}
      <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3 style={{ marginTop: '0' }}>Filters</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Provider */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Provider
            </label>
            <select
              value={selectedProvider || ''}
              onChange={(e) => {
                setSelectedProvider(e.target.value ? parseInt(e.target.value) : null)
                setOffset(0)
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All Providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Initiative */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Initiative
            </label>
            <select
              value={selectedInitiative}
              onChange={(e) => {
                setSelectedInitiative(e.target.value)
                setOffset(0)
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All Initiatives</option>
              <option value="HCC Recapture">HCC Recapture</option>
              <option value="HCC Gap">HCC Gap</option>
              <option value="Screenings">Screenings</option>
              <option value="Audit">Audit</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setOffset(0)
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Denied">Denied</option>
              <option value="Pending Chart">Pending Chart</option>
              <option value="Referred to Provider">Referred to Provider</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleClearFilters}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Results */}
      <div>
        <div style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
          {memberCount} members · {opportunityCount} opportunities
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
        ) : memberCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No members found</div>
        ) : (
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            {memberIds.map((memberId) => {
              const group = memberGroups[memberId]
              const isExpanded = expandedMembers.has(memberId)

              return (
                <div key={memberId} style={{ borderBottom: '1px solid #ddd' }}>
                  {/* Member Header */}
                  <div
                    onClick={() => toggleMemberExpand(memberId)}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#f5f5f5',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#efefef')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                        {group.member_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ID: {group.member_id} · {group.opportunities.length} opportunity(ies)
                      </div>
                    </div>
                    <div style={{ fontSize: '18px', color: '#666' }}>
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>

                  {/* Member Opportunities */}
                  {isExpanded && (
                    <div>
                      <div style={{ overflowX: 'auto' }}>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                          }}
                        >
                          <thead>
                            <tr style={{ backgroundColor: '#fafafa' }}>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                Provider
                              </th>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                ICD-10
                              </th>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                HCC
                              </th>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                Initiative
                              </th>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                Status
                              </th>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                Evidence
                              </th>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.opportunities.map((opp) => (
                              <tr key={opp.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>{opp.provider_name}</td>
                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>
                                  {opp.icd_10}
                                  <div style={{ fontSize: '11px', color: '#666' }}>{opp.icd_10_description}</div>
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>
                                  {opp.hcc_code}
                                  <div style={{ fontSize: '11px', color: '#666' }}>{opp.hcc_description}</div>
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>
                                  <span
                                    style={{
                                      padding: '2px 6px',
                                      backgroundColor: '#e0e0e0',
                                      borderRadius: '3px',
                                      fontSize: '11px',
                                    }}
                                  >
                                    {opp.initiative}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>
                                  <span
                                    style={{
                                      padding: '2px 6px',
                                      backgroundColor: opp.disposition_status === 'Open' ? '#fff0e0' : '#e0f0ff',
                                      borderRadius: '3px',
                                      fontSize: '11px',
                                    }}
                                  >
                                    {opp.disposition_status}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: '13px', maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {opp.evidence || '—'}
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>
                                  <Link
                                    href={`/projects/mra-vbc-opps/opportunities/${opp.id}`}
                                    style={{ color: '#0070f3', textDecoration: 'none' }}
                                  >
                                    Review
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Showing row <strong>{offset + 1}</strong> to <strong>{Math.min(offset + limit, totalCount)}</strong> of <strong>{totalCount}</strong> opportunities
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', color: '#666' }}>
                  Per page:
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value))
                      setOffset(0)
                    }}
                    style={{
                      marginLeft: '8px',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: offset === 0 ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: offset === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ← Previous
                </button>
                <div style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', minWidth: '100px', textAlign: 'center' }}>
                  {totalPages === 0 ? 'Page 0 of 0' : `Page ${currentPage} of ${totalPages}`}
                </div>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={currentPage >= totalPages}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage >= totalPages ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
