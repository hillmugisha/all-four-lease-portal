/**
 * GET /api/leases/:id/signed-pdf
 *
 * Streams the latest signed (or partially signed) PDF directly from DocuSign.
 * The "combined" document always reflects the current state of the envelope —
 * signatures appear as each party completes them, not only after all parties sign.
 *
 * Returns 404 if the lease has no envelope ID yet.
 */
import { NextRequest, NextResponse } from 'next/server'
import docusign from 'docusign-esign'
import { getDocuSignClient, getAccountId } from '@/lib/docusign'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { data: lease, error } = await getSupabaseAdmin()
      .from('leases')
      .select('docusign_envelope_id, lessee_name, vehicle_vin')
      .eq('id', params.id)
      .single()

    if (error || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    if (!lease.docusign_envelope_id) {
      return NextResponse.json(
        { error: 'This lease has not been sent to DocuSign yet.' },
        { status: 404 },
      )
    }

    const apiClient = await getDocuSignClient()
    const accountId = getAccountId()
    const envelopesApi = new docusign.EnvelopesApi(apiClient)

    // "combined" returns all envelope documents merged into one PDF,
    // with whatever signatures have been applied so far.
    // The 4th arg (null) satisfies the SDK's optsOrCallback parameter.
    const pdfBytes = (await envelopesApi.getDocument(
      accountId,
      lease.docusign_envelope_id,
      'combined',
      {},
    )) as unknown as Buffer

    const safeName = (lease.lessee_name ?? '').replace(/\s+/g, '-')
    const filename  = `lease-${safeName}-${lease.vehicle_vin ?? ''}.pdf`

    // Convert to Uint8Array so Next.js accepts it as a valid BodyInit
    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        // Never cache — we always want the freshest signed copy.
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[signed-pdf]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
