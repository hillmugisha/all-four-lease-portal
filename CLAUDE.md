# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Next.js dev server (localhost:3000)
npm run build    # Build production bundle
npm run lint     # Run ESLint
```

No automated test suite exists — testing is done manually in the browser.

## Architecture Overview

This is a **Next.js 14 App Router** lease agreement management platform for All Four, LLC. The core workflow is: Draft → Preview PDF → Send to DocuSign → Activate.

### Data Flow

```
LeaseForm (react-hook-form, 5-step wizard)
  → POST /api/leases or /api/send-to-docusign
    → calculateLease() derives financial fields
    → Saved to Supabase `leases` table (both inputs and calculated results)
  → PDF generation: LeaseRecord → lease-adapter → LeaseTemplateData → Handlebars → HTML → Puppeteer → PDF
  → DocuSign: PDF + anchor tabs → envelope with 3 signers (lessee, co-lessee, lessor)
```

### Key Layer Responsibilities

- **`lib/types.ts`** — Core domain types: `LeaseFormData` (form input union), `LeaseRecord` (Supabase row, snake_case), `CalculatedFields`
- **`lib/lease-types.ts`** — `LeaseTemplateData`: the shape Handlebars templates expect (camelCase sections: lessor, lessee, vehicle, financials, ach, signatures, etc.)
- **`lib/calculations.ts`** — `calculateLease(financialInputs)`: computes gross cap cost, adjusted cap cost, depreciation, base/total monthly payment, totals
- **`lib/lease-adapter.ts`** — `recordToTemplateData()`: converts snake_case `LeaseRecord` → `LeaseTemplateData`; handles null/zero → "N/A" coercion
- **`lib/lease-renderer.ts`** — `renderLease(templateData)`: compiles `templates/lease.html` via Handlebars with helpers (fmt, fmtDate, fmtRate, naOrFmt, ordinal)
- **`lib/docusign.ts`** — `getDocuSignClient()`: JWT OAuth with cached token; handles PEM key normalization (escaped `\n` in env var)
- **`lib/supabase.ts`** — Lazy singleton `SupabaseClient` using publishable key (browser-safe)
- **`lib/supabase-admin.ts`** — Server-side-only `SupabaseClient` using secret key (bypasses RLS); used by all API routes

### Lease Lifecycle & Status

| State | Location | `is_active` | `doc_status` |
|---|---|---|---|
| Draft | New Leases table | false | null/draft |
| Sent to DocuSign | New Leases table | false | sent |
| Active | Current Leases tab | true | — |
| Expired/Sold | Expired/Sold tabs | — | — |

**Important:** When a lease is activated, it must disappear immediately from the New Leases table — never stay there with a badge or indicator.

### PDF & Template Generation

Templates live in `templates/` as Handlebars HTML files:
- `lease.html` — Main lease agreement (also used for DocuSign)
- `ach-authorization.html` / `ach-authorization-nie.html` — ACH forms
- `insurance-acknowledgement.html`

DocuSign anchor strings embedded in template (anchor-based tab placement):
```
\lessee1_sign\  \lessee1_date\
\colessee_sign\  \colessee_date\
\lessor_sign\  \lessor_date\
```

### Column Persistence

`lib/usePersistedColumns.ts` + `components/OrganizeColumnsModal.tsx` — table column visibility is persisted to `localStorage` per table. Each table (CurrentLeases, ExpiredLeases, SoldLeases, etc.) has its own storage key.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   # Supabase "publishable key" — safe for browser use
SUPABASE_SECRET_KEY                    # Supabase "secret key" — server-side only, never expose to browser
DOCUSIGN_INTEGRATION_KEY
DOCUSIGN_USER_ID
DOCUSIGN_ACCOUNT_ID
DOCUSIGN_PRIVATE_KEY   # PEM format; escaped \n is handled automatically
DOCUSIGN_BASE_URL      # defaults to demo sandbox (account-d.docusign.com)
```

## Database

Schema defined in `supabase/schema.sql`. The `leases` table stores both raw inputs and all calculated financial fields (audit trail). Supabase RLS is currently open (allow all) — must be locked to authenticated users before production.

The `vehicles_on_order` table is separate (see `supabase/vehicles_on_order_schema.sql`).

## Notable Constraints

- **Puppeteer** runs headless Chromium server-side for PDF generation — the `generate-pdf` API route is a long-running server action, not a client action
- Calculated lease fields are **stored** in the DB alongside inputs (not recomputed on read) to preserve the deal economics at signing time
- `lib/lease-adapter.ts` must handle every new field added to `LeaseRecord` — when adding DB columns, update the adapter and `LeaseTemplateData` type together
