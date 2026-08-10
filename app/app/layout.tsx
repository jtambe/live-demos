import type { Metadata } from 'next'
import './globals.css'
import VercelBadge from '@/components/VercelBadge'

export const metadata: Metadata = {
  title: 'Live Demos',
  description: 'A collection of interactive demos',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">🚀</text></svg>',
  },
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
