'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Merges saved columns with current defaults so that newly-added default
 * columns automatically appear even when a user has a prior saved preference.
 * Columns the user explicitly hid (not in saved, not in defaults) stay hidden.
 * New default columns are inserted at the same relative position they occupy
 * in the defaults array.
 */
function mergeWithDefaults(saved: string[], defaults: string[]): string[] {
  const savedSet = new Set(saved)
  const newCols  = defaults.filter((c) => !savedSet.has(c))
  if (newCols.length === 0) return saved

  const result = [...saved]
  for (const col of newCols) {
    const defaultIdx = defaults.indexOf(col)
    // Insert right after the closest preceding default column already in saved
    let insertAt = 0
    for (let i = defaultIdx - 1; i >= 0; i--) {
      const pos = result.indexOf(defaults[i])
      if (pos !== -1) { insertAt = pos + 1; break }
    }
    result.splice(insertAt, 0, col)
  }
  return result
}

/**
 * Like useState, but persists the column selection to localStorage so
 * it survives navigation. Automatically injects any newly-added default
 * columns into the saved preference on load.
 */
export function usePersistedColumns(storageKey: string, defaultCols: string[]) {
  const [visibleCols, setVisibleColsState] = useState<string[]>(defaultCols)

  // Load from localStorage after hydration to avoid server/client mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleColsState(mergeWithDefaults(parsed, defaultCols))
        }
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
