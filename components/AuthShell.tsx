'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import clsx from 'clsx'

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />

      {/* Floating re-open button — only visible when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-black text-neutral-400 hover:text-white transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>
      )}

      <main className={clsx('min-h-screen flex flex-col transition-[margin] duration-300', sidebarOpen ? 'ml-60' : 'ml-0')}>
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
