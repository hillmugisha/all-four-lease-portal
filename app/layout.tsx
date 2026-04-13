import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'All Four & NIE Hub',
  description: 'Lease agreement generation and tracking for All Four, LLC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Sidebar />
        {/* Offset content by sidebar width */}
        <main className="ml-60 min-h-screen flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <footer className="border-t border-gray-200 py-4 px-8">
            <p className="text-xs text-gray-400 text-center">
              © {new Date().getFullYear()} Pritchard. All rights reserved.
            </p>
          </footer>
        </main>
      </body>
    </html>
  )
}
