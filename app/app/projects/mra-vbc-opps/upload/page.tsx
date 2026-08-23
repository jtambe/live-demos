'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getApiUrl } from '@/utils/api'

interface UploadResult {
  success: boolean
  upload_id: number | null
  errors: string[]
  counts: {
    inserted: number
    updated: number
    skipped: number
    non_hcc: number
  }
}

export default function MraUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [userEmail, setUserEmail] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) {
      router.push('/projects/mra-vbc-opps/auth/login')
      return
    }

    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const decoded = JSON.parse(atob(parts[1]))
        setUserEmail(decoded.email)
      }
    } catch (e) {
      console.error('Failed to decode token')
    }
  }, [token, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${getApiUrl()}/mra-vbc-opps/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Upload failed')
        return
      }

      setResult(data)
      if (data.success) {
        setFile(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/projects/mra-vbc-opps" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← Back to MRA VBC Opps
        </Link>
      </div>

      <h1>Upload MRA CSV</h1>
      <p style={{ color: '#666' }}>Upload a CSV file to ingest coding opportunities into the platform.</p>

      <div style={{ marginTop: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Uploaded By:
          </label>
          <div style={{ padding: '8px', color: '#666' }}>
            {userEmail}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Select CSV File:
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
            style={{
              display: 'block',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
            }}
          />
          {file && <p style={{ marginTop: '8px', color: '#666' }}>Selected: {file.name}</p>}
        </div>

        <button
          onClick={handleUpload}
          disabled={loading || !file}
          style={{
            padding: '12px 24px',
            backgroundColor: loading || !file ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !file ? 'not-allowed' : 'pointer',
            fontSize: '16px',
          }}
        >
          {loading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#fee',
            border: '1px solid #f88',
            borderRadius: '4px',
            color: '#c00',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '40px' }}>
          <div
            style={{
              padding: '16px',
              backgroundColor: result.success ? '#efe' : '#ffe',
              border: `1px solid ${result.success ? '#8f8' : '#ff8'}`,
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            <strong>{result.success ? '✓ Upload Successful' : '⚠ Upload Completed with Issues'}</strong>
            <p style={{ marginTop: '8px', marginBottom: '0' }}>Upload ID: {result.upload_id}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0070f3' }}>
                {result.counts.inserted}
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>Inserted</div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                {result.counts.updated}
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>Updated (Year-over-Year)</div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44' }}>
                {result.counts.skipped}
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>Skipped</div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#888' }}>
                {result.counts.non_hcc}
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>Non-HCC (No Revenue)</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginTop: '0' }}>Errors ({result.errors.length}):</h3>
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontSize: '13px',
                }}
              >
                {result.errors.map((err, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', color: '#666' }}>
                    • {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setFile(null)
              setResult(null)
              setError(null)
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  )
}
