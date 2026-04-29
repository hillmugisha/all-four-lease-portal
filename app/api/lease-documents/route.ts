import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'
import { getUserEmailFromRequest } from '@/lib/auth-user'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const leaseId   = searchParams.get('lease_id')
  const tableName = searchParams.get('table_name')

  if (!leaseId || !tableName) {
    return NextResponse.json({ error: 'lease_id and table_name are required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('lease_documents')
    .select('*')
    .eq('lease_id', leaseId)
    .eq('table_name', tableName)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const formData  = await req.formData()
  const leaseId   = formData.get('lease_id') as string
  const tableName = formData.get('table_name') as string
  const docType   = formData.get('doc_type') as string
  const file      = formData.get('file') as File | null

  if (!leaseId || !tableName || !docType || !file) {
    return NextResponse.json({ error: 'lease_id, table_name, doc_type, and file are required' }, { status: 400 })
  }

  const supabase    = getSupabaseAdmin()
  const ext         = file.name.includes('.') ? file.name.split('.').pop() : ''
  const uid         = crypto.randomUUID()
  const storagePath = `${tableName}/${leaseId}/${docType}/${uid}${ext ? '.' + ext : ''}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('lease-documents')
    .upload(storagePath, arrayBuffer, { contentType: file.type || 'application/octet-stream' })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data, error: dbError } = await supabase
    .from('lease_documents')
    .insert({ lease_id: leaseId, table_name: tableName, doc_type: docType, file_name: file.name, storage_path: storagePath })
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from('lease-documents').remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const userEmail = await getUserEmailFromRequest(req)
  await logAudit(userEmail, 'document.uploaded', data.id, {
    lease_id:  leaseId,
    file_name: file.name,
    doc_type:  docType,
  })

  return NextResponse.json(data, { status: 201 })
}
