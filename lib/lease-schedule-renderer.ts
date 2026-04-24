import Handlebars from 'handlebars'
import fs from 'fs'
import path from 'path'
import type { LeaseScheduleTemplateData } from './lease-schedule-types'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return 'N/A'
  const [y, m, d] = iso.split('-').map(Number)
  return `${m}/${d}/${y}`
}

function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return 'N/A'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Handlebars instance (isolated from the main lease-renderer instance) ─────

const hbs = Handlebars.create()

hbs.registerHelper('fmt',          (n: unknown) => fmt(n as number | null))
hbs.registerHelper('fmtDateShort', (s: unknown) => fmtDateShort(s as string))
hbs.registerHelper('fmtDateLong',  (s: unknown) => fmtDateLong(s as string))
// Zero-based index → 1-based row number
hbs.registerHelper('add1', (n: unknown) => Number(n) + 1)

// ─── Logo caching ─────────────────────────────────────────────────────────────

let _logoDataUri: string | null = null
let _nieLogoDataUri: string | null = null

function getLogoDataUri(lessorName: string): string {
  const isNie = lessorName.toLowerCase().includes('north iowa equity')
  if (isNie) {
    if (_nieLogoDataUri !== null) return _nieLogoDataUri
    const p = path.join(process.cwd(), 'NIE logo.png')
    _nieLogoDataUri = fs.existsSync(p)
      ? `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
      : ''
    return _nieLogoDataUri
  }
  if (_logoDataUri !== null) return _logoDataUri
  const p = path.join(process.cwd(), 'All Four logo.webp')
  _logoDataUri = fs.existsSync(p)
    ? `data:image/webp;base64,${fs.readFileSync(p).toString('base64')}`
    : ''
  return _logoDataUri
}

// ─── Template compiler ────────────────────────────────────────────────────────

let _compiled: HandlebarsTemplateDelegate | null = null

function getTemplate(): HandlebarsTemplateDelegate {
  if (_compiled) return _compiled
  const src = fs.readFileSync(path.join(process.cwd(), 'templates', 'lease-schedule.html'), 'utf-8')
  _compiled = hbs.compile(src)
  return _compiled
}

// ─── Main render function ─────────────────────────────────────────────────────

export function renderLeaseSchedule(data: LeaseScheduleTemplateData): string {
  const logoDataUri = getLogoDataUri(data.lessor.name)
  return getTemplate()({ ...data, logoDataUri })
}
