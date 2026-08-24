'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '@/utils/api'

interface Opportunity {
  id: number
  member_id: number
  provider_id: number
  provider_name: string
  payer_id: number
  payer_name: string
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
  const [memberGroups, setMemberGroups] = useState<Record<string, MemberGroup>>({})
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [membersWithVbcCount, setMembersWithVbcCount] = useState(0)
  const [totalOpportunitiesCount, setTotalOpportunitiesCount] = useState(0)

  // Bulk selection and modal
  const [selectedOpportunities, setSelectedOpportunities] = useState<Set<number>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkNote, setBulkNote] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push('/projects/mra-vbc-opps/auth/login')
      return
    }
    loadProviders()
  }, [router])

  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      loadWorkQueue()
    }
  }, [selectedProvider, selectedStatus, limit, offset])

  const toggleOpportunitySelection = (oppId: number) => {
    const newSelected = new Set(selectedOpportunities)
    if (newSelected.has(oppId)) {
      newSelected.delete(oppId)
    } else {
      newSelected.add(oppId)
    }
    setSelectedOpportunities(newSelected)
  }

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedOpportunities.size === 0) return

    try {
      setBulkUpdating(true)
      const token = getAuthToken()

      if (!token) {
        setError('Failed to authenticate')
        return
      }

      const response = await fetch(`${getApiUrl()}/mra-vbc-opps/opportunities/bulk/disposition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          opportunity_ids: Array.from(selectedOpportunities),
          disposition_status: bulkStatus,
          justification_note: bulkNote || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Failed to update dispositions')
        return
      }

      // Reset modal and selections
      setShowBulkModal(false)
      setSelectedOpportunities(new Set())
      setBulkStatus('')
      setBulkNote('')

      // Refresh data
      await loadWorkQueue()
    } catch (err) {
      setError('Failed to update dispositions')
      console.error(err)
    } finally {
      setBulkUpdating(false)
    }
  }

  const loadProviders = async () => {
    try {
      const token = getAuthToken()
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
    const token = getAuthToken()
    if (!token) return
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedProvider) params.append('provider_id', selectedProvider.toString())
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
      setMembersWithVbcCount(data.members_with_vbc_count || 0)
      setTotalOpportunitiesCount(data.total_opportunities_count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work queue')
    } finally {
      setLoading(false)
    }
  }

  const toggleMemberExpand = (memberId: string) => {
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
    setSelectedStatus('')
    setOffset(0)
  }

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(membersWithVbcCount / limit)
  const memberIds = Object.keys(memberGroups)
  const memberCount = memberIds.length

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '40px' }}>Work Queue</h1>

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

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
              Update {selectedOpportunities.size} Opportunit{selectedOpportunities.size === 1 ? 'y' : 'ies'}
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Status
              </label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Select a status</option>
                <option value="Open">Open</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Denied">Denied</option>
                <option value="Pending Chart">Pending Chart</option>
                <option value="Referred to Provider">Referred to Provider</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Note (Optional)
              </label>
              <textarea
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Add a note for this disposition..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  minHeight: '100px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowBulkModal(false)}
                disabled={bulkUpdating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={!bulkStatus || bulkUpdating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: bulkStatus ? '#1976d2' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: bulkStatus ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => bulkStatus && (e.currentTarget.style.backgroundColor = '#1565c0')}
                onMouseLeave={(e) => bulkStatus && (e.currentTarget.style.backgroundColor = '#1976d2')}
              >
                {bulkUpdating ? 'Applying...' : 'Apply to All'}
              </button>
            </div>
          </div>
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
          {membersWithVbcCount} members with VBC opportunities · {totalOpportunitiesCount} total opportunities
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
              const memberSelectedCount = group.opportunities.filter((opp) => selectedOpportunities.has(opp.id)).length

              return (
                <div key={memberId} style={{ borderBottom: '1px solid #ddd' }}>
                  {/* Member Header */}
                  <div
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                        {group.member_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ID: {group.member_id} · {group.opportunities.length} opportunity(ies)
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {memberSelectedCount > 0 && (
                        <>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1976d2' }}>
                            {memberSelectedCount} selected
                          </span>
                          <button
                            onClick={() => setShowBulkModal(true)}
                            style={{
                              padding: '8px 14px',
                              backgroundColor: '#4caf50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#45a049')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4caf50')}
                          >
                            Update ({memberSelectedCount})
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => router.push(`/projects/mra-vbc-opps/opportunities/member/${encodeURIComponent(group.member_id)}`)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#1976d2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1565c0')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1976d2')}
                      >
                        Review
                      </button>
                      <button
                        onClick={() => toggleMemberExpand(memberId)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          color: '#666',
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
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
                            <tr style={{ backgroundColor: 'antiquewhite' }}>
                              <th style={{ padding: '12px 12px', textAlign: 'center', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600', width: '40px' }}>
                                <input
                                  type="checkbox"
                                  checked={group.opportunities.every((opp) => selectedOpportunities.has(opp.id))}
                                  onChange={() => {
                                    const newSelected = new Set(selectedOpportunities)
                                    const allSelected = group.opportunities.every((opp) => selectedOpportunities.has(opp.id))
                                    group.opportunities.forEach((opp) => {
                                      if (allSelected) {
                                        newSelected.delete(opp.id)
                                      } else {
                                        newSelected.add(opp.id)
                                      }
                                    })
                                    setSelectedOpportunities(newSelected)
                                  }}
                                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                              </th>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                Provider
                              </th>
                              <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #ddd', fontSize: '12px', fontWeight: '600' }}>
                                Payer
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
                            </tr>
                          </thead>
                          <tbody>
                            {group.opportunities.map((opp) => (
                              <tr key={opp.id} style={{ borderBottom: '1px solid #eee', backgroundColor: selectedOpportunities.has(opp.id) ? '#e3f2fd' : '#f9f9f9' }}>
                                <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: '13px' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedOpportunities.has(opp.id)}
                                    onChange={() => toggleOpportunitySelection(opp.id)}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                  />
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>{opp.provider_name}</td>
                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>{opp.payer_name}</td>
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
                                <td style={{ padding: '12px 20px', fontSize: '13px', maxWidth: '400px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                  <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.4' }}>{opp.evidence || '—'}</div>
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
        {totalOpportunitiesCount > 0 && (
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
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
