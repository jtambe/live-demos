'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ClaimsNavigation from '@/components/ClaimsNavigation'
import { getApiUrl } from '@/utils/api'
import styles from '../claims-anomaly.module.css'

interface UploadResponse {
  success: boolean
  message: string
  next_steps: string
  file_hash: string
  rows_processed: number
  status: 'analyzing' | 'complete'
}

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${getApiUrl()}/api/claims-anomaly/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data: UploadResponse = await response.json()
      console.log('Upload response:', data)

      if (data.status === 'analyzing' || data.status === 'complete') {
        console.log('Redirecting to claims...')
        // Redirect to claims page
        router.push('/projects/claims-anomaly/claims')
      } else {
        console.warn('Unexpected status:', data.status)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  return (
    <main className={styles.container}>
      <h1>Claims Anomaly Detection</h1>

      <ClaimsNavigation activePage="upload" />

      <div className={styles.infoBox}>
        <p>
          <strong>⚡ Running on Vercel Free Tier</strong><br />
          Upload up to <strong>5,000 records</strong> per file. Analysis uses data from the <strong>last 3 years</strong> and completes within <strong>60 seconds</strong>. This proof of concept supports up to <strong>200 clients</strong> due to infrastructure constraints.
        </p>
      </div>


      <div className={styles.uploadSection}>
        <h2>Upload Claims Data</h2>
        <p>Upload a CSV file with claims data to detect anomalies</p>

        <div className={styles.uploadForm}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
            className={styles.fileInput}
          />
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={styles.uploadButton}
          >
            {loading ? 'Uploading...' : 'Upload & Analyze'}
          </button>
        </div>

        {file && (
          <p className={styles.fileName}>
            Selected: <strong>{file.name}</strong>
          </p>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </main>
  )
}
