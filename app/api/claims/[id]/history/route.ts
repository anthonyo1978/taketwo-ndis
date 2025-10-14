import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { format } from 'date-fns'

/**
 * GET /api/claims/[id]/history
 * Fetch claim history including system logs and exported files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: claimId } = await params
    const supabase = await createClient()

    // Create service role client for storage operations
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch claim details (to get claim_number for storage path)
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('claim_number, file_path')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json(
        { success: false, error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Fetch system logs for this claim
    const { data: logs, error: logsError } = await supabase
      .from('system_logs')
      .select('*')
      .eq('entity_id', claimId)
      .eq('entity_type', 'claim')
      .order('created_at', { ascending: false })

    if (logsError) {
      console.error('Error fetching logs:', logsError)
    }

    // Fetch all files from storage for this claim
    const folderPath = `exports/claims/${claim.claim_number}/`
    const { data: files, error: filesError } = await supabaseService
      .storage
      .from('claim-exports')
      .list(`exports/claims/${claim.claim_number}`, {
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (filesError) {
      console.error('Error fetching files:', filesError)
    }

    // Generate signed URLs for files
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file: any) => {
        const filePath = `exports/claims/${claim.claim_number}/${file.name}`
        const { data: signedUrlData } = await supabaseService
          .storage
          .from('claim-exports')
          .createSignedUrl(filePath, 3600) // 1 hour validity

        return {
          name: file.name,
          path: filePath,
          size: file.metadata?.size || 0,
          createdAt: file.created_at,
          downloadUrl: signedUrlData?.signedUrl
        }
      })
    )

    // Format logs
    const formattedLogs = (logs || []).map((log: any) => ({
      id: log.id,
      action: log.action,
      createdAt: log.created_at,
      userId: log.user_id,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent
    }))

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        files: filesWithUrls
      }
    })

  } catch (error) {
    console.error('Error fetching claim history:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

