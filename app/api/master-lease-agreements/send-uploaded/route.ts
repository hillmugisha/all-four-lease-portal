import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getDocuSignClient, getAccountId } from '@/lib/docusign'
import { PDFDocument } from 'pdf-lib'
import docusign from 'docusign-esign'

export const dynamic = 'force-dynamic'

const BUCKET = 'mla-documents'

async function ensureBucket() {
  const { error } = await getSupabaseAdmin().storage.createBucket(BUCKET, { public: true })
  if (error && !error.message.includes('already exists') && !error.message.includes('duplicate')) {
    throw new Error(`Could not create storage bucket: ${error.message}`)
  }
}

// Fixed-coordinate tab helpers for uploaded PDFs (no anchor strings available).
// Letter page at 96 dpi = 816 × 1056 px. Tabs are placed near the bottom of the last page.

function signTab(page: number, x: string, y: string): docusign.SignHere {
  return { pageNumber: String(page), xPosition: x, yPosition: y }
}

function dateTab(page: number, x: string, y: string): docusign.DateSigned {
  return { pageNumber: String(page), xPosition: x, yPosition: y }
}

export async function POST(req: NextRequest) {
  try {
    const formData         = await req.formData()
    const lesseeName       = formData.get('lessee_name')       as string | null
    const signerName       = formData.get('signer_name')       as string | null
    const signerEmail      = formData.get('signer_email')      as string | null
    const signerTitle      = formData.get('signer_title')      as string | null
    const lessorName       = formData.get('lessor_name')       as string | null
    const lessorFirstName  = formData.get('lessor_first_name') as string | null
    const lessorLastName   = formData.get('lessor_last_name')  as string | null
    const lessorTitle      = formData.get('lessor_title')      as string | null
    const lessorEmail      = formData.get('lessor_email')      as string | null
    const file             = formData.get('file')              as File   | null

    if (!lesseeName || !signerName || !signerEmail || !lessorName || !lessorFirstName || !lessorLastName || !lessorEmail || !file) {
      return NextResponse.json({ error: 'lessee_name, signer_name, signer_email, lessor_name, lessor_first_name, lessor_last_name, lessor_email, and file are required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Determine the last page for signature tab placement
    const pdfDoc   = await PDFDocument.load(buffer)
    const lastPage = pdfDoc.getPageCount()

    // Upload file to storage
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
    const path     = `pending-signing/${Date.now()}-${safeName}`

    await ensureBucket()

    const supabase = getSupabaseAdmin()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    // Create MLA record
    const { data: mla, error: insertError } = await supabase
      .from('master_lease_agreements')
      .insert({
        status:                'sent',
        lessee_name:           lesseeName,
        lessee_type:           'business',
        lessee_address:        '',
        lessee_city:           '',
        lessee_state:          '',
        lessee_zip:            '',
        lessee_email:              signerEmail,
        customer_signer_name:      signerName,
        customer_signer_email:     signerEmail,
        customer_signer_title:     signerTitle || null,
        document_url:              publicUrl,
        lessor_name:               lessorName,
        lessor_signer_first_name:  lessorFirstName,
        lessor_signer_last_name:   lessorLastName,
        lessor_signer_title:       lessorTitle || null,
        lessor_signer_email:       lessorEmail,
        lessor_address:        '1 TeamQuest Way',
        lessor_po_box:         'P.O. Box 147',
        lessor_city:           'Clear Lake',
        lessor_state:          'IA',
        lessor_zip:            '50428',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // ── DocuSign envelope ─────────────────────────────────────────────────────
    // Signature row 1 (lessee signer): x=50, y=820 on the last page
    // Signature row 2 (lessor signer): x=50, y=910 on the last page
    // Both sign in parallel (routingOrder 1).

    const apiClient = await getDocuSignClient()
    const accountId = getAccountId()

    const docs: docusign.Document[] = [{
      documentBase64: buffer.toString('base64'),
      name:           `Master Vehicle Lease Agreement — ${lesseeName}`,
      fileExtension:  'pdf',
      documentId:     '1',
    }]

    const lessorFullName = `${lessorFirstName} ${lessorLastName}`

    const signers: docusign.Signer[] = [
      {
        email:        signerEmail,
        name:         signerName,
        recipientId:  '1',
        routingOrder: '1',
        tabs: {
          signHereTabs:   [signTab(lastPage, '50',  '820')],
          dateSignedTabs: [dateTab(lastPage, '250', '826')],
        },
      },
      {
        email:        lessorEmail,
        name:         lessorFullName,
        recipientId:  '2',
        routingOrder: '1',
        tabs: {
          signHereTabs:   [signTab(lastPage, '50',  '910')],
          dateSignedTabs: [dateTab(lastPage, '250', '916')],
        },
      },
    ]

    const envelopeDefinition: docusign.EnvelopeDefinition = {
      emailSubject: `Please sign the Master Vehicle Lease Agreement — ${lesseeName}`,
      documents:    docs,
      recipients:   { signers },
      status:       'sent',
    }

    const envelopesApi = new docusign.EnvelopesApi(apiClient)
    const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })

    if (!result.envelopeId) throw new Error('DocuSign did not return an envelope ID')

    // Persist envelope ID and sent timestamp
    await supabase
      .from('master_lease_agreements')
      .update({
        docusign_envelope_id: result.envelopeId,
        sent_at:              new Date().toISOString(),
      })
      .eq('id', mla.id)

    return NextResponse.json({ mlaId: mla.id, envelopeId: result.envelopeId }, { status: 201 })
  } catch (err) {
    console.error('[send-uploaded-mla]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
