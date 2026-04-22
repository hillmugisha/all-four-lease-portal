import type { Metadata } from 'next'
import './globals.css'
import AuthShell from '@/components/AuthShell'

export const metadata: Metadata = {
  title: 'All Four & NIE Hub',
  description: 'Lease agreement generation and tracking for All Four, LLC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  )
}
