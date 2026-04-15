'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, FolderOpen, Truck, FileSignature, CalendarX, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

export default function Sidebar() {
  const path = usePathname()
  const [leasesOpen, setLeasesOpen] = useState(
    path.startsWith('/current-leases') || path.startsWith('/new-lease') ||
    path.startsWith('/leases/expired') || path.startsWith('/leases/purchased')
  )

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white fixed left-0 top-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold shrink-0">
          A4
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">All Four &amp; NIE Hub</p>
          <p className="text-xs text-gray-400 leading-tight">Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">

        {/* ── Vehicles on Order ── */}
        <Link
          href="/vehicles-on-order"
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            path.startsWith('/vehicles-on-order')
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Truck size={17} className="shrink-0" />
          Vehicles on Order
        </Link>

        {/* ── Leases (collapsible group) ── */}
        <button
          type="button"
          onClick={() => setLeasesOpen((o) => !o)}
          className={clsx(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            path.startsWith('/current-leases') || path.startsWith('/new-lease') ||
            path.startsWith('/leases/expired') || path.startsWith('/leases/purchased')
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <FileSignature size={17} className="shrink-0" />
          <span className="flex-1 text-left">Leases</span>
          <svg
            className={clsx('h-4 w-4 shrink-0 transition-transform', leasesOpen && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {leasesOpen && (
          <div className="ml-4 border-l border-gray-200 pl-3 space-y-0.5">
            <Link
              href="/current-leases"
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                path === '/current-leases'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <FolderOpen size={15} className="shrink-0" />
              Active
            </Link>

            <Link
              href="/leases/expired"
              title="Leases that have reached their end date and are no longer active."
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                path === '/leases/expired'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <CalendarX size={15} className="shrink-0" />
              Expired
            </Link>

            <Link
              href="/leases/purchased"
              title="Leases that were converted into a purchase."
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                path === '/leases/purchased'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <ShoppingCart size={15} className="shrink-0" />
              Purchased
            </Link>

            <Link
              href="/new-lease"
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                path === '/new-lease'
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <FileText size={15} className="shrink-0" />
              New Lease
            </Link>
          </div>
        )}

      </nav>
    </aside>
  )
}
