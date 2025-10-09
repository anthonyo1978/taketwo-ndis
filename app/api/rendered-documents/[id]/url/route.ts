import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * GET /api/rendered-documents/:id/url
 * 
 * Generates a fresh signed URL for a rendered document
 * Signed URLs expire after 15 minutes, so this allows re-access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    const supabase = await createClient()
    
    // Fetch the document record
    const { data: document, error: docError } = await supabase
      .from('rendered_documents')
      .select('storage_path')
      .eq('id', documentId)
      .single()
    
    if (docError || !document) {
      console.error('[Document URL API] Document not found:', docError)
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }
    
    // Generate a fresh signed URL (15 min expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('exports')
      .createSignedUrl(document.storage_path, 60 * 15)
    
    if (signedUrlError || !signedUrlData) {
      console.error('[Document URL API] Failed to create signed URL:', signedUrlError)
      return NextResponse.json(
        { success: false, error: 'Failed to create download link' },
        { status: 500 }
      )
    }
    
    // Update the document record with the new signed URL
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    
    await supabase
      .from('rendered_documents')
      .update({
        signed_url_last: signedUrlData.signedUrl,
        signed_url_expires_at: expiresAt
      })
      .eq('id', documentId)
    
    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
      expiresAt
    })
    
  } catch (error) {
    console.error('[Document URL API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

