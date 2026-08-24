'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getApiUrl } from '@/utils/api'

interface Person {
  id: number
  name: string
  gender: string
  country: string
  date_of_birth: string
}

export default function TestPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTestData()
  }, [])

  const loadTestData = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${getApiUrl()}/mra-vbc-opps/test/people`)

      if (!res.ok) {
        setError(`HTTP ${res.status}: Failed to load test data`)
        return
      }

      const data = await res.json()
      setPeople(data.people || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/projects/mra-vbc-opps" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← Back to MRA VBC Opps
        </Link>
      </div>

      <h1>PostgREST Schema Accessibility Test</h1>
      <p style={{ color: '#666' }}>
        Testing if PostgREST can read mra_vbc_opps.test_people table (no RLS, no auth)
      </p>

      {error && (
        <div style={{ padding: '16px', backgroundColor: '#fee', border: '1px solid #f88', borderRadius: '4px', color: '#c00', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
      ) : people.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No data loaded</div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', color: '#666' }}>
            Loaded <strong>{people.length}</strong> records
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Gender</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Country</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date of Birth</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px' }}>{person.id}</td>
                  <td style={{ padding: '12px' }}>{person.name}</td>
                  <td style={{ padding: '12px' }}>{person.gender}</td>
                  <td style={{ padding: '12px' }}>{person.country}</td>
                  <td style={{ padding: '12px' }}>{new Date(person.date_of_birth).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '16px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '13px' }}>
        <strong>Test Details:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Endpoint: GET /mra-vbc-opps/test/people</li>
          <li>Table: mra_vbc_opps.test_people (no RLS, public select)</li>
          <li>Query: supabase.table(&apos;mra_vbc_opps.test_people&apos;).select(&apos;*&apos;)</li>
          <li>Purpose: Diagnose PostgREST schema accessibility</li>
        </ul>
      </div>
    </div>
  )
}
