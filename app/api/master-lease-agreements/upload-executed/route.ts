import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const BUCKET = 'mla-documents'

async function ensureBucket() {
  const { error } = await getSupabaseAdmin().storage.createBucket(BUCKET, { public: true })
  // Ignore "already exists" errors
  if (error && !error.message.includes('already exists') && !error.message.includes('duplicate')) {
    throw new Error(`Could not create storage bucket: ${error.message}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData    = await req.formData()
    const lesseeName  = formData.get('lessee_name')   as string | null
    const executedDate = formData.get('executed_date') as string | null
    const file        = formData.get('file')           as File   | null

    if (!lesseeName || !executedDate || !file) {
      return NextResponse.json(
        { error: 'lessee_name, executed_date, and file are required' },
        { status: 400 }
      )
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
    const path     = `executed/${Date.now()}-${safeName}`

    await ensureBucket()

    const supabase = getSupabaseAdmin()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    const { data, error } = await supabase
      .from('master_lease_agreements')
      .insert({
        status:         'executed',
        executed_date:  executedDate,
        lessee_name:    lesseeName,
        lessee_type:    'business',
        lessee_address: '',
        lessee_city:    '',
        lessee_state:   '',
        lessee_zip:     '',
        lessee_email:   '',
        document_url:   publicUrl,
        lessor_name:    'All Four, LLC',
        lessor_address: '1 TeamQuest Way',
        lessor_po_box:  'P.O. Box 147',
        lessor_city:    'Clear Lake',
        lessor_state:   'IA',
        lessor_zip:     '50428',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[upload-executed-mla]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
