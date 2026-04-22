'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Like useState, but persists the column selection to localStorage so
 * it survives navigation away from and back to the page.
 *
 * @param storageKey  A unique key per table, e.g. "cols:vehicles-on-order"
 * @param defaultCols The default column keys to use when nothing is stored
 */
export function usePersistedColumns(storageKey: string, defaultCols: string[]) {
  const [visibleCols, setVisibleColsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return defaultCols
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore malformed storage
    }
    return defaultCols
  })

  // Sync on mount in case SSR returned defaultCols
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        if (Array.isArray(parsed) && parsed.length > 0) setVisibleColsState(parsed)
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const setVisibleCols = useCallback((cols: string[]) => {
    setVisibleColsState(cols)
    try {
      localStorage.setItem(storageKey, JSON.stringify(cols))
    } catch {
      // ignore storage errors (private browsing quota, etc.)
    }
  }, [storageKey])

  return [visibleCols, setVisibleCols] as const
}
