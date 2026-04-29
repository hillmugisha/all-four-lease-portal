import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'
import { getUserEmailFromRequest } from '@/lib/auth-user'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const supabase = getSupabaseAdmin()

  const { data: doc, error: fetchError } = await supabase
    .from('lease_documents')
    .select('storage_path, lease_id, file_name')
    .eq('id', id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { error: storageError } = await supabase.storage
    .from('lease-documents')
    .remove([doc.storage_path])

  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 })

  const { error: dbError } = await supabase
    .from('lease_documents')
    .delete()
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const userEmail = await getUserEmailFromRequest(_req)
  await logAudit(userEmail, 'document.deleted', id, {
    lease_id:  doc.lease_id,
    file_name: doc.file_name,
  })

  return new NextResponse(null, { status: 204 })
}
