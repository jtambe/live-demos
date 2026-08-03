'use client'

import { useState, useEffect } from 'react'
import ClaimsNavigation from '@/components/ClaimsNavigation'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { getApiUrl } from '@/utils/api'
import styles from '../claims-anomaly.module.css'
import tableRowStyles from '@/components/TableRowNumbers.module.css'
import AnomalyDetailsModal from '@/components/AnomalyDetailsModal'
import BulkReviewModal from '@/components/BulkReviewModal'

interface AnomalyGroup {
  client_id: number
  client_name: string
  service_month: string
  rule_count: number
  max_confidence: string
  rules_violated: Array<{
    id: string
    rule: string
    confidence: string
    affected_metrics: string
    notes: string
    status: string
  }>
  last_seen_at: string
  notes: string
  review_status: string | null
  review_feedback: string
}

export default function AnomaliesGroupedPage() {
  const [allAnomalies, setAllAnomalies] = useState<AnomalyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterClientId, setFilterClientId] = useState('')
  const [filterClientName, setFilterClientName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<AnomalyGroup | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)

  const {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    handlePageChange,
    handleItemsPerPageChange,
  } = usePagination(100)

  useEffect(() => {
    setCurrentPage(1)
  }, [filterClientId, filterClientName, setCurrentPage])

  useEffect(() => {
    fetchGroupedAnomalies()
  }, [])

  const fetchGroupedAnomalies = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/claims-anomaly/anomalies/grouped`)

      if (!response.ok) throw new Error('Failed to fetch anomalies')

      const groupedData: AnomalyGroup[] = await response.json()
      setAllAnomalies(groupedData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch anomalies')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAnomalies = () => {
    return allAnomalies.filter(a => {
      if (filterClientId && a.client_id.toString() !== filterClientId) {
        return false
      }
      if (filterClientName && !a.client_name.toLowerCase().includes(filterClientName.toLowerCase())) {
        return false
      }
      return true
    })
  }

  const getPaginatedAnomalies = () => {
    const filtered = getFilteredAnomalies()
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filtered.slice(start, end)
  }

  const filteredCount = getFilteredAnomalies().length

  const handleOpenDetails = (group: AnomalyGroup) => {
    setSelectedGroup(group)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedGroup(null)
  }

  const handleToggleSelect = (group: AnomalyGroup) => {
    const key = `${group.client_id}-${group.service_month}`
    setSelectedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const handleCloseBulkModal = () => {
    setShowBulkModal(false)
    setSelectedGroups(new Set())
  }

  const getSelectedGroupObjects = () => {
    return getPaginatedAnomalies().filter(g => selectedGroups.has(`${g.client_id}-${g.service_month}`))
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high':
        return '#dc2626'
      case 'medium':
        return '#f59e0b'
      case 'low':
        return '#3b82f6'
      default:
        return '#6b7280'
    }
  }

  const getUniqueConfidenceLevels = (group: AnomalyGroup) => {
    const levels = new Set(group.rules_violated.map(r => r.confidence))
    return Array.from(levels).sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return (order[a as keyof typeof order] || 3) - (order[b as keyof typeof order] || 3)
    })
  }

  const getRulesList = (group: AnomalyGroup) => {
    const rules = new Set(group.rules_violated.map(r => r.rule))
    return Array.from(rules).sort()
  }

  if (loading) {
    return (
      <main className={styles.container}>
        <h1>Claims Anomaly Detection - Results</h1>
        <ClaimsNavigation activePage="anomalies" />
        <div className={styles.loadingMessage}>Loading anomalies...</div>
      </main>
    )
  }

  return (
    <main className={styles.container}>
      <h1>Claims Anomaly Detection - Results</h1>

      <ClaimsNavigation activePage="anomalies" />

      <div className={styles.infoBox}>
        <p>
          <strong>🔍 Anomaly Detection Results</strong><br />
          Grouped by client and month. Click "View Details" to see all rules and manage status.
        </p>
      </div>

      {error ? (
        <div className={styles.error}>{error}</div>
      ) : allAnomalies.length > 0 ? (
        <>
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label htmlFor="filterClientId">Client ID:</label>
              <input
                id="filterClientId"
                type="number"
                placeholder="Enter client ID..."
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="filterClientName">Client Name:</label>
              <input
                id="filterClientName"
                type="text"
                placeholder="Search by client name..."
                value={filterClientName}
                onChange={(e) => setFilterClientName(e.target.value)}
                className={styles.filterInput}
              />
            </div>
            {(filterClientId || filterClientName) && (
              <button
                onClick={() => {
                  setFilterClientId('')
                  setFilterClientName('')
                }}
                className={styles.clearButton}
              >
                Clear Filters
              </button>
            )}
          </div>

          <h2>Anomaly Groups ({filteredCount}{filterClientId || filterClientName ? ` of ${allAnomalies.length}` : ''})</h2>

          <div className={styles.anomaliesTableWrapper}>
            <table className={`${styles.anomaliesTable} ${tableRowStyles.withRowNumbers}`}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      disabled
                      style={{ cursor: 'default' }}
                    />
                  </th>
                  <th>#</th>
                  <th>Client ID</th>
                  <th>Client Name</th>
                  <th>Month</th>
                  <th>Anomalies Count</th>
                  <th>Confidence Score</th>
                  <th>Rules Violated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody style={{ counterReset: `row-number ${(currentPage - 1) * itemsPerPage}` }}>
                {getPaginatedAnomalies().map((group, idx) => {
                  const isSelected = selectedGroups.has(`${group.client_id}-${group.service_month}`)
                  return (
                  <tr key={`${group.client_id}-${group.service_month}`} style={{ backgroundColor: isSelected ? '#f0f9ff' : 'transparent' }}>
                    <td style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(group)}
                      />
                    </td>
                    <td className={tableRowStyles.rowNumber} />
                    <td style={{ fontWeight: 600 }}>{group.client_id}</td>
                    <td>{group.client_name}</td>
                    <td>{group.service_month}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#1f2937' }}>
                      {group.rule_count}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {getUniqueConfidenceLevels(group).map(level => (
                          <span
                            key={level}
                            style={{
                              backgroundColor: getConfidenceColor(level),
                              color: 'white',
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              display: 'inline-block',
                              width: 'fit-content',
                            }}
                          >
                            {level.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '300px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {getRulesList(group).map(rule => (
                          <span key={rule} style={{ backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                            {rule}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenDetails(group)}
                        className={styles.viewButton}
                        style={{ padding: '6px 12px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredCount > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredCount}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}

          {selectedGroups.size > 0 && (
            <div style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              zIndex: 50
            }}>
              <span style={{ fontWeight: 600 }}>
                {selectedGroups.size} selected
              </span>
              <button
                onClick={() => setShowBulkModal(true)}
                style={{
                  backgroundColor: 'white',
                  color: '#3b82f6',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Review All
              </button>
              <button
                onClick={() => setSelectedGroups(new Set())}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.noAnomalies}>
          ✅ You're all caught up — no anomalies found
        </div>
      )}

      {showModal && selectedGroup && (
        <AnomalyDetailsModal
          group={selectedGroup}
          onClose={handleCloseModal}
        />
      )}

      {showBulkModal && selectedGroups.size > 0 && (
        <BulkReviewModal
          selectedCount={selectedGroups.size}
          groups={getSelectedGroupObjects()}
          onClose={handleCloseBulkModal}
        />
      )}
    </main>
  )
}
