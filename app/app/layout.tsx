import type { Metadata } from 'next'
import './globals.css'
import VercelBadge from '@/components/VercelBadge'

export const metadata: Metadata = {
  title: 'Live Demos',
  description: 'A collection of interactive demos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <VercelBadge />
        {children}
      </body>
    </html>
  )
}
