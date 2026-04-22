'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <main className="ml-60 min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-gray-200 py-4 px-8">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} Pritchard. All rights reserved.
          </p>
        </footer>
      </main>
    </>
  )
}
