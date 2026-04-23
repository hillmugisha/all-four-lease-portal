'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, FolderOpen, Truck, FileSignature, CalendarX, ShoppingCart, ClipboardList, LogOut, History } from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

export default function Sidebar() {
  const path     = usePathname()
  const router   = useRouter()
  const [leasesOpen, setLeasesOpen] = useState(
    path.startsWith('/current-leases') || path.startsWith('/new-lease') ||
    path.startsWith('/leases/expired') || path.startsWith('/leases/purchased')
  )
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    try {
      const cookie = document.cookie.split('; ').find((c) => c.startsWith('allfour_user='))
      if (cookie) {
        const val = JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')))
        setUserEmail(val.email ?? '')
      }
    } catch { /* ignore */ }
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-neutral-800 bg-black fixed left-0 top-0">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-neutral-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold shrink-0">
          A4
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">All Four &amp; NIE Hub</p>
          <p className="text-xs text-neutral-400 leading-tight">Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">

        {/* ── Vehicles On Order ── */}
        <Link
          href="/vehicles-on-order"
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            path.startsWith('/vehicles-on-order')
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:bg-white/8 hover:text-white'
          )}
        >
          <Truck size={17} className="shrink-0" />
          Vehicles On Order
        </Link>

        {/* ── Leases (collapsible group) ── */}
        <button
          type="button"
          onClick={() => setLeasesOpen((o) => !o)}
          className={clsx(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            path.startsWith('/current-leases') || path.startsWith('/new-lease') ||
            path.startsWith('/leases/expired') || path.startsWith('/leases/purchased')
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:bg-white/8 hover:text-white'
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
          <div className="ml-4 border-l border-neutral-700 pl-3 space-y-0.5">
            <Link
              href="/current-leases"
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                path === '/current-leases'
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:bg-white/8 hover:text-white'
              )}
            >
              <FolderOpen size={15} className="shrink-0" />
              Active
            </Link>

            <Link
              href="/leases/expired"
              title="Leases that are out of service and no longer active."
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                path === '/leases/expired'
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:bg-white/8 hover:text-white'
              )}
            >
              <CalendarX size={15} className="shrink-0" />
              Out of Service
            </Link>

            {/* Purchased tab — hidden for now, will be re-enabled later */}
            {false && (
              <Link
                href="/leases/purchased"
                title="Leases that were converted into a purchase."
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  path === '/leases/purchased'
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-400 hover:bg-white/8 hover:text-white'
                )}
              >
                <ShoppingCart size={15} className="shrink-0" />
                Purchased
              </Link>
            )}

            <Link
              href="/new-lease"
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                path === '/new-lease'
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:bg-white/8 hover:text-white'
              )}
            >
              <FileText size={15} className="shrink-0" />
              New Lease
            </Link>
          </div>
        )}

        {/* ── Section divider ── */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Audit</p>
        </div>

        {/* ── Audit Logs ── */}
        <Link
          href="/audit-logs"
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            path.startsWith('/audit-logs')
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:bg-white/8 hover:text-white'
          )}
        >
          <ClipboardList size={17} className="shrink-0" />
          Audit Logs
        </Link>

        {/* ── Section divider ── */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Archive</p>
        </div>

        {/* ── Lease History ── */}
        <Link
          href="/leases/history"
          title="Archived out-of-service lease records — not included in reporting."
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            path.startsWith('/leases/history')
              ? 'bg-white/10 text-white'
              : 'text-neutral-400 hover:bg-white/8 hover:text-white'
          )}
        >
          <History size={17} className="shrink-0" />
          Lease History
        </Link>

      </nav>

      {/* User + Logout */}
      <div className="border-t border-neutral-800 px-4 py-3 space-y-1">
        {userEmail && (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">
              {userEmail[0].toUpperCase()}
            </div>
            <p className="flex-1 truncate text-xs text-neutral-400">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
        >
          <LogOut size={15} className="shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
