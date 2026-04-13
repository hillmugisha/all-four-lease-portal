/**
 * GET /api/leases/:id/envelope-status
 *
 * Fetches the live signer statuses from DocuSign, maps them to our internal
 * doc_status, persists any change to Supabase, and returns the full picture
 * so the frontend can decide whether to reload the PDF.
 *
 * Mapping logic:
 *   envelope completed                             → completed
 *   any routing-order-1 signer completed           → customer_signed
 *   otherwise                                      → sent
 *
 * Returns:
 *   {
 *     doc_status:       'sent' | 'customer_signed' | 'completed'
 *     envelope_status:  raw DocuSign envelope status string
 *     hasEnvelope:      boolean
 *     signed_count:     number   // recipients whose status === 'completed'
 *     total_count:      number   // total recipients
 *     signers: Array<{
 *       name, email, routing_order, status, signed_at
 *     }>
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import docusign from 'docusign-esign'
import { getDocuSignClient, getAccountId } from '@/lib/docusign'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ─── Status mapping ───────────────────────────────────────────────────────────

type PortalStatus = 'sent' | 'customer_signed' | 'completed'

function mapStatus(
  envelopeStatus: string,
  signers: docusign.Signer[],
): PortalStatus {
  if (envelopeStatus === 'completed') return 'completed'

  // Any lessee (routing order 1) has completed their signature
  const lesseesComplete = signers
    .filter((s) => s.routingOrder === '1')
    .some((s) => s.status === 'completed')

  return lesseesComplete ? 'customer_signed' : 'sent'
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { data: lease, error } = await getSupabase()
      .from('leases')
      .select('docusign_envelope_id, doc_status')
      .eq('id', params.id)
      .single()

    if (error || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    // No envelope yet — return current DB state without hitting DocuSign
    if (!lease.docusign_envelope_id) {
      return NextResponse.json({
        doc_status:      lease.doc_status,
        envelope_status: null,
        hasEnvelope:     false,
        signed_count:    0,
        total_count:     0,
        signers:         [],
      })
    }

    const apiClient = await getDocuSignClient()
    const accountId = getAccountId()
    const envelopesApi = new docusign.EnvelopesApi(apiClient)

    // Fetch envelope header (status) and recipient list in one call
    const [envelope, recipientsResult] = await Promise.all([
      envelopesApi.getEnvelope(accountId, lease.docusign_envelope_id),
      envelopesApi.listRecipients(accountId, lease.docusign_envelope_id),
    ])

    const signers: docusign.Signer[] = recipientsResult.signers ?? []
    const newStatus = mapStatus(envelope.status ?? '', signers)

    // completed is a terminal state — never downgrade it regardless of what
    // DocuSign returns (handles race conditions, retries, and any edge cases).
    const effectiveStatus: PortalStatus =
      lease.doc_status === 'completed' ? 'completed' : newStatus

    // Persist only genuine forward-progress changes.
    // doc_status is updated first in its own query so a missing signed_at column
    // can never prevent the status from being saved.
    if (effectiveStatus !== lease.doc_status) {
      await getSupabase()
        .from('leases')
        .update({ doc_status: effectiveStatus })
        .eq('id', params.id)

      // signed_at is optional — best-effort only
      if (effectiveStatus === 'completed') {
        await getSupabase()
          .from('leases')
          .update({ signed_at: new Date().toISOString() })
          .eq('id', params.id)
          .then(() => {}) // swallow error if column doesn't exist yet
      }
    }

    const signedCount = signers.filter((s) => s.status === 'completed').length

    return NextResponse.json({
      doc_status:      effectiveStatus,
      envelope_status: envelope.status,
      hasEnvelope:     true,
      signed_count:    signedCount,
      total_count:     signers.length,
      signers: signers.map((s) => ({
        name:          s.name,
        email:         s.email,
        routing_order: s.routingOrder,
        status:        s.status,           // 'created' | 'sent' | 'delivered' | 'completed' | 'declined'
        signed_at:     (s as Record<string, unknown>).signedDateTime as string | null ?? null,
      })),
    })
  } catch (err) {
    console.error('[envelope-status]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
