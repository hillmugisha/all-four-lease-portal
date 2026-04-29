'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }

      router.push('/portfolio-overview')
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ECEEF3] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg px-10 py-10">

        {/* Logos */}
        <div className="flex items-center justify-center gap-5 mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/all-four-logo.webp" alt="All Four logo" className="h-10 w-auto object-contain" />
          <div className="w-px h-7 bg-gray-200" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nie-logo.png" alt="NIE logo" className="h-10 w-auto object-contain" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 text-center leading-tight">
          All Four &amp; NIE Hub
        </h1>
        <p className="mt-1.5 text-sm text-gray-400 text-center">
          Lease management portal
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Pritchard email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="you@pritchards.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-colors"
            />
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#6B7FA3] hover:bg-[#5A6E93] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Continue
          </button>
        </form>

      </div>
    </div>
  )
}
