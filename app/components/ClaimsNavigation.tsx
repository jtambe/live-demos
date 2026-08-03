import Link from 'next/link'
import styles from './ClaimsNavigation.module.css'

interface ClaimsNavigationProps {
  activePage: 'upload' | 'claims' | 'anomalies'
}

export default function ClaimsNavigation({ activePage }: ClaimsNavigationProps) {
  return (
    <nav className={styles.nav}>
      <Link href="/projects/claims-anomaly/upload">
        <button className={`${styles.navButton} ${activePage === 'upload' ? styles.active : ''}`}>
          📤 Upload Claims
        </button>
      </Link>
      <Link href="/projects/claims-anomaly/claims">
        <button className={`${styles.navButton} ${activePage === 'claims' ? styles.active : ''}`}>
          📊 View Claims
        </button>
      </Link>
      <Link href="/projects/claims-anomaly/anomalies">
        <button className={`${styles.navButton} ${activePage === 'anomalies' ? styles.active : ''}`}>
          🔍 View Anomalies
        </button>
      </Link>
    </nav>
  )
}
