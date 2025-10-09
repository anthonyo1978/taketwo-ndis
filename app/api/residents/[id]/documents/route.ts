import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * GET /api/residents/:id/documents
 * 
 * Fetches all rendered documents (PDFs) for a specific resident
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: residentId } = await params
    const supabase = await createClient()
    
    // Fetch all documents for this resident, ordered by most recent first
    const { data: documents, error } = await supabase
      .from('rendered_documents')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[Documents API] Error fetching documents:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }
    
    // Convert snake_case to camelCase
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      contractId: doc.contract_id,
      residentId: doc.resident_id,
      templateId: doc.template_id,
      templateVersion: doc.template_version,
      storagePath: doc.storage_path,
      signedUrlLast: doc.signed_url_last,
      signedUrlExpiresAt: doc.signed_url_expires_at,
      renderMs: doc.render_ms,
      fileSizeBytes: doc.file_size_bytes,
      createdAt: doc.created_at
    }))
    
    return NextResponse.json({
      success: true,
      data: formattedDocuments
    })
    
  } catch (error) {
    console.error('[Documents API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

