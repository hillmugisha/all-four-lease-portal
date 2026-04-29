# All Four Lease — Improvement Plan

Ordered from highest impact priority to lowest.

---

## 1. Replace unsigned cookie session with signed JWT
**Priority: Security — critical**
The current session cookie is Base64-encoded JSON with no signature. Anyone who can read their own cookie can forge it. This is the most urgent fix since it's a live security hole in a financial app.

## 2. Zod validation on all API endpoints
**Priority: Security + data integrity**
Every POST route (`/api/send-to-docusign`, `/api/portfolio/import`, etc.) accepts raw form data with no schema validation. Unvalidated API inputs are an attack surface and can corrupt lease records. Pairs with #1 as a security layer.

## 3. Form-level validation across all steps
**Priority: Data integrity**
Step 1 has phone regex validation but Steps 3–5 (vehicle details, financials, signatures) have none. Financial fields allow negatives and non-numeric input that silently becomes NaN. Bad financial data getting saved to the DB is a silent corruption risk — lease economics must be correct at write time.

## 4. Error boundaries + user-facing error messages
**Priority: Reliability / trust**
There are 20+ `console.error()` calls with no corresponding UI feedback. Users get no signal when PDF generation or DocuSign fails — left guessing whether to retry. Adding `error.tsx` files and surfacing structured errors would fix this. Erodes trust in a workflow that handles real contracts.

## 5. PDF generation progress feedback
**Priority: Core workflow UX**
Puppeteer can take 5–10 seconds. The user currently just sees a spinning button with no indication of progress or timeout. Every single lease goes through this step — a 5–10s black-box spinner on a critical action is a significant usability gap. A step-based status message ("Generating... / Uploading...") would help.

## 6. Loading states and skeleton screens
**Priority: General UX**
Every table manually toggles `setLoading` with no skeleton UI. There are no `loading.tsx` files for any page. Tables load with no feedback — less critical than workflow gaps but affects daily usability for every page visit.

## 7. Move hardcoded config to env vars or DB
**Priority: Operational flexibility**
The auth domain (`@pritchards.com`), contact email, disposition fee ($195), and lessor defaults are all hardcoded in source files. Changing these currently requires a code deploy. They should live in env vars or a settings table.

## 8. Structured audit logging with request context
**Priority: Compliance / debugging**
Audit logs exist but only for high-level actions. API calls (who triggered what, when, response code, duration) aren't logged. The current audit trail is too coarse to debug incidents or satisfy compliance reviews as the portfolio grows.

## 9. DocuSign token cache resilience
**Priority: Scale — Vercel-specific**
The JWT token is cached in-process memory. On Vercel (serverless), each cold start fetches a new token, risking rate limits. Moving to Upstash Redis or KV would share the cache across instances. Low urgency now, but cheap to fix before it bites.

## 10. Consistent pagination across data endpoints
**Priority: Performance at scale**
Some endpoints use a 100-row batch, others go up to 5,000. No cursor-based or offset pagination is exposed to the UI. Not painful yet, but will be as the portfolio grows past a few hundred leases.

---

## Status

| # | Item | Status |
|---|------|--------|
| 1 | Signed JWT session | Pending |
| 2 | Zod API validation | Pending |
| 3 | Form validation (Steps 2–5) | Pending |
| 4 | Error boundaries + user messages | Pending |
| 5 | PDF generation progress feedback | Pending |
| 6 | Loading states / skeleton screens | Pending |
| 7 | Hardcoded config → env/DB | Pending |
| 8 | Structured audit logging | Pending |
| 9 | DocuSign token cache | Pending |
| 10 | Consistent pagination | Pending |
