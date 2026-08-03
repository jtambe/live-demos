import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
