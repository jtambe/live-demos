'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Project {
  id: string
  name: string
  description: string
  path: string
  status: 'active' | 'soon'
}

const projects: Project[] = [
  {
    id: 'claims-anomaly',
    name: 'Claims Anomaly Detection',
    description: 'Detect anomalies in insurance claims data using machine learning',
    path: '/projects/claims-anomaly',
    status: 'active',
  },
  {
    id: 'project-2',
    name: 'Project 2',
    description: 'Coming soon...',
    path: '/projects/project-2',
    status: 'soon',
  },
  {
    id: 'project-3',
    name: 'Project 3',
    description: 'Coming soon...',
    path: '/projects/project-3',
    status: 'soon',
  },
]

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'error'>('error')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/health`)
        if (response.ok) {
          setBackendStatus('connected')
        }
      } catch (error) {
        console.error('Backend health check failed:', error)
        setBackendStatus('error')
      }
    }

    checkBackend()
  }, [])

  return (
    <main>
      <h1>🚀 Live Demos</h1>

      <div style={{ textAlign: 'center', marginBottom: 40, color: '#4a5568' }}>
        <p style={{ marginBottom: 12 }}>
          Backend Status:{' '}
          <span
            style={{
              fontWeight: 'bold',
              color: backendStatus === 'connected' ? '#22863a' : '#cb2431',
            }}
          >
            {backendStatus === 'connected' ? '✓ Connected' : '✗ Disconnected'}
          </span>
        </p>
        <p style={{ fontSize: '0.9rem' }}>
          Make sure FastAPI backend is running on{' '}
          {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
        </p>
      </div>

      <div className="projects-grid">
        {projects.map((project) => (
          <Link key={project.id} href={project.path}>
            <div className="project-card">
              <h2>{project.name}</h2>
              <p>{project.description}</p>
              <span
                className={`project-status status-${project.status}`}
              >
                {project.status === 'active' ? '● Active' : '● Coming Soon'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
