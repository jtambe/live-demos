'use client'

import { useState, useEffect } from 'react'
import ClaimsNavigation from '@/components/ClaimsNavigation'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { getApiUrl } from '@/utils/api'
import styles from '../claims-anomaly.module.css'
import tableRowStyles from '@/components/TableRowNumbers.module.css'

interface Claim {
  id: number
  client_id: number
  client_name: string
  service_month: string
  count_eligible_primary_members: number
  num_unique_claims_medical: number
  num_unique_claims_rx: number
  num_service_lines_medical: number
  num_service_lines_rx: number
  total_plan_pay_medical: number
  total_plan_pay_rx: number
  total_garner_incentive_paid_medical: number
  total_garner_incentive_paid_rx: number
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [totalClaims, setTotalClaims] = useState(0)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterClientId, setFilterClientId] = useState('')
  const [filterClientName, setFilterClientName] = useState('')

  const {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    handlePageChange,
    handleItemsPerPageChange,
  } = usePagination(100)

  useEffect(() => {
    setCurrentPage(1)
  }, [sortOrder, filterClientId, filterClientName])

  useEffect(() => {
    fetchClaims()
  }, [currentPage, itemsPerPage, sortOrder, filterClientId, filterClientName])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * itemsPerPage

      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
        order_by: 'client_id',
        order_desc: sortOrder === 'desc' ? 'true' : 'false',
      })

      if (filterClientId) params.append('filter_client_id', filterClientId)
      if (filterClientName) params.append('filter_client_name', filterClientName)

      const response = await fetch(
        `${getApiUrl()}/claims-anomaly/claims?${params.toString()}`
      )

      if (!response.ok) throw new Error('Failed to fetch claims')

      const data = await response.json()
      setClaims(data.claims || [])
      setTotalClaims(data.total || 0)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch claims')
    } finally {
      setLoading(false)
    }
  }


  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      // Call backend analyze endpoint (triggers analysis on all claims in database)
      const response = await fetch(`${getApiUrl()}/claims-anomaly/analyze`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Analysis failed')

      const data = await response.json()
      console.log('Analysis started:', data)

      // Redirect to anomalies page
      window.location.href = '/projects/claims-anomaly/anomalies'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setAnalyzing(false)
    }
  }

  return (
    <main className={styles.container}>
      <h1>Claims Data Management</h1>

      <ClaimsNavigation activePage="claims" />

      <div className={styles.infoBox}>
        <p>
          <strong>📊 Total Claims: {totalClaims}</strong><br />
          Manage claims data across up to <strong>200 clients</strong>. Click <strong>"Analyze All for Anomalies"</strong> to scan the last <strong>3 years</strong> of historical data for potential anomalies.
        </p>
      </div>

      <div className={styles.actionsBar}>
        <button
          onClick={handleAnalyze}
          disabled={claims.length === 0 || analyzing}
          className={styles.analyzeButton}
        >
          {analyzing ? 'Analyzing...' : '🔍 Analyze All for Anomalies'}
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="sort-order">Sort:</label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className={styles.filterSelect}
          >
            <option value="asc">Client ID (A-Z)</option>
            <option value="desc">Client ID (Z-A)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="filter-client-id">Client ID:</label>
          <input
            id="filter-client-id"
            type="number"
            placeholder="Filter by ID"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            className={styles.filterInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="filter-client-name">Client Name:</label>
          <input
            id="filter-client-name"
            type="text"
            placeholder="Filter by name"
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

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loadingMessage}>Loading claims...</div>
      ) : claims.length === 0 ? (
        <div className={styles.noAnomalies}>
          No claims data found. Upload CSV file first.
        </div>
      ) : (
        <>
          <div className={styles.anomaliesTableWrapper}>
            <table
              className={`${styles.anomaliesTable} ${tableRowStyles.withRowNumbers}`}
              style={{ counterReset: `row-number ${(currentPage - 1) * itemsPerPage}` }}
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client ID</th>
                  <th>Client Name</th>
                  <th>Month</th>
                  <th>Primary<br />Members</th>
                  <th>Med<br />Claims</th>
                  <th>RX<br />Claims</th>
                  <th>Med<br />Lines</th>
                  <th>RX<br />Lines</th>
                  <th>Plan Pay<br />(Med)</th>
                  <th>Plan Pay<br />(RX)</th>
                  <th>Incentive<br />(Med)</th>
                  <th>Incentive<br />(RX)</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className={tableRowStyles.rowNumber} />
                    <td>{claim.client_id}</td>
                    <td>{claim.client_name}</td>
                    <td>{claim.service_month}</td>
                    <td>{claim.count_eligible_primary_members}</td>
                    <td>{claim.num_unique_claims_medical}</td>
                    <td>{claim.num_unique_claims_rx}</td>
                    <td>{claim.num_service_lines_medical}</td>
                    <td>{claim.num_service_lines_rx}</td>
                    <td>${claim.total_plan_pay_medical?.toFixed(2) || '0.00'}</td>
                    <td>${claim.total_plan_pay_rx?.toFixed(2) || '0.00'}</td>
                    <td>${claim.total_garner_incentive_paid_medical?.toFixed(2) || '0.00'}</td>
                    <td>${claim.total_garner_incentive_paid_rx?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {claims.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={totalClaims}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </>
      )}
    </main>
  )
}
