import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const supabase = getSupabaseAdmin()

  const { data: doc, error: fetchError } = await supabase
    .from('lease_documents')
    .select('storage_path, file_name')
    .eq('id', id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from('lease-documents')
    .createSignedUrl(doc.storage_path, 3600)

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate signed URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signedData.signedUrl, file_name: doc.file_name })
}
