import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserId, logAction, getRequestMetadata } from 'lib/services/audit-logger'
import { format } from 'date-fns'

/**
 * POST /api/claims/[id]/export
 * Generate CSV export file for a claim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: claimId } = await params
    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const metadata = getRequestMetadata(request)
    
    // Create service role client for storage operations (bypasses RLS)
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch claim details
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json(
        { success: false, error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Fetch all transactions for this claim with resident details
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select(`
        id,
        resident_id,
        contract_id,
        occurred_at,
        amount,
        note,
        status,
        residents (
          first_name,
          last_name
        )
      `)
      .eq('claim_id', claimId)
      .order('occurred_at', { ascending: true })

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transactions found for this claim' },
        { status: 400 }
      )
    }

    // Validate that ALL transactions have status = 'picked_up'
    const invalidTransactions = transactions.filter((tx: any) => tx.status !== 'picked_up')
    if (invalidTransactions.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot export claim: ${invalidTransactions.length} transaction(s) have invalid status. All transactions must be in 'picked_up' status.`,
          details: invalidTransactions.map((tx: any) => ({ id: tx.id, status: tx.status }))
        },
        { status: 400 }
      )
    }

    // Generate CSV content
    const csvHeader = 'Claim ID,Transaction ID,Resident Name,Contract ID,Service Date,Amount,Description,Status,Organisation ID,Exported At\n'
    
    const csvRows = transactions.map((tx: any) => {
      const residentName = tx.residents 
        ? `${tx.residents.first_name} ${tx.residents.last_name}` 
        : 'Unknown'
      const serviceDate = format(new Date(tx.occurred_at), 'yyyy-MM-dd')
      const exportedAt = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      
      return [
        claim.claim_number,
        tx.id,
        `"${residentName}"`, // Quoted in case of commas in name
        tx.contract_id,
        serviceDate,
        tx.amount,
        `"${(tx.note || '').replace(/"/g, '""')}"`, // Escape quotes in description
        tx.status,
        '', // Organisation ID placeholder (NULL)
        exportedAt
      ].join(',')
    }).join('\n')

    const csvContent = csvHeader + csvRows

    // Generate filename with timestamp
    const timestamp = format(new Date(), 'yyyyMMdd-HHmm')
    const filename = `HAVEN-CLAIM-${claim.claim_number}-${timestamp}.csv`
    const filePath = `exports/claims/${claim.claim_number}/${filename}`

    // Upload to Supabase Storage using service role (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseService
      .storage
      .from('claim-exports')
      .upload(filePath, csvContent, {
        contentType: 'text/csv',
        upsert: false // Create new version each time
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Use the path returned from upload (it should match our filePath)
    const uploadedPath = uploadData?.path || filePath
    console.log('File uploaded to:', uploadedPath)

    // Update claim record with file metadata and status
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        file_path: uploadedPath,
        file_generated_at: new Date().toISOString(),
        file_generated_by: userId,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', claimId)

    if (updateError) {
      console.error('Error updating claim:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update claim record' },
        { status: 500 }
      )
    }

    // Generate signed URL for download (valid for 15 minutes) using service role
    const { data: signedUrlData, error: signedUrlError } = await supabaseService
      .storage
      .from('claim-exports')
      .createSignedUrl(uploadedPath, 900) // 900 seconds = 15 minutes

    if (signedUrlError) {
      console.error('Error generating signed URL for path:', uploadedPath, signedUrlError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate download link' },
        { status: 500 }
      )
    }

    // Log the action
    if (userId) {
      await logAction({
        userId,
        entityType: 'claim' as any,
        entityId: claimId,
        action: 'update',
        details: {
          action: 'claim_file_generated',
          claimNumber: claim.claim_number,
          filename,
          transactionCount: transactions.length,
          totalAmount: transactions.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0)
        },
        ...metadata
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        filename,
        downloadUrl: signedUrlData.signedUrl,
        transactionCount: transactions.length,
        fileGeneratedAt: new Date().toISOString()
      },
      message: `Claim file created successfully with ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
    })

  } catch (error) {
    console.error('Error generating claim export:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

