'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, FolderOpen } from 'lucide-react'
import clsx from 'clsx'

const NAV_LINKS = [
  { href: '/current-leases', label: 'Current Leases', icon: FolderOpen },
  { href: '/new-lease',      label: 'New Lease',       icon: FileText },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white fixed left-0 top-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold shrink-0">
          A4
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">All Four Lease</p>
          <p className="text-xs text-gray-400 leading-tight">Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              path === href
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon size={17} className="shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

    </aside>
  )
}
