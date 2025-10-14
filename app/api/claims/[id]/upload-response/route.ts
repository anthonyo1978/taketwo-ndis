import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserId, logAction, getRequestMetadata } from 'lib/services/audit-logger'
import { format } from 'date-fns'

/**
 * POST /api/claims/[id]/upload-response
 * Upload and process claim response file (CSV)
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

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Only CSV files are supported' },
        { status: 400 }
      )
    }

    // Fetch claim details
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('id, claim_number, status')
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json(
        { success: false, error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Fetch all transactions for this claim
    const { data: claimTransactions, error: txError } = await supabase
      .from('transactions')
      .select('id, amount, status, note')
      .eq('claim_id', claimId)

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch claim transactions' },
        { status: 500 }
      )
    }

    if (!claimTransactions || claimTransactions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transactions found for this claim' },
        { status: 400 }
      )
    }

    // Parse CSV file
    const fileContent = await file.text()
    const lines = fileContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty or invalid' },
        { status: 400 }
      )
    }

    // Parse header and rows
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const txIdIndex = headers.findIndex(h => h.includes('transaction') && h.includes('id'))
    const statusIndex = headers.findIndex(h => h === 'status')
    const amountIndex = headers.findIndex(h => h === 'amount')

    if (txIdIndex === -1 || statusIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'CSV must contain "Transaction ID" and "Status" columns' },
        { status: 400 }
      )
    }

    // Process each row
    const results = {
      totalProcessed: 0,
      totalPaid: 0,
      totalRejected: 0,
      totalErrors: 0,
      totalUnmatched: 0,
      amountMismatches: [] as Array<{ transactionId: string; expectedAmount: number; responseAmount: number }>,
      unmatchedIds: [] as string[],
      errors: [] as Array<{ transactionId: string; error: string }>
    }

    const transactionUpdates: Array<{ id: string; status: string; note?: string }> = []

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      const transactionId = row[txIdIndex]
      const responseStatus = row[statusIndex]?.toLowerCase()
      const responseAmount = amountIndex !== -1 ? parseFloat(row[amountIndex]) : null

      if (!transactionId) continue

      results.totalProcessed++

      // Find matching transaction
      const matchedTx = claimTransactions.find(tx => tx.id === transactionId)

      if (!matchedTx) {
        results.totalUnmatched++
        results.unmatchedIds.push(transactionId)
        continue
      }

      // Validate amount if provided
      if (responseAmount !== null && Math.abs(parseFloat(matchedTx.amount as any) - responseAmount) > 0.01) {
        results.amountMismatches.push({
          transactionId,
          expectedAmount: parseFloat(matchedTx.amount as any),
          responseAmount
        })
      }

      // Map response status to our status
      let newStatus: string
      if (['success', 'approved', 'paid'].includes(responseStatus)) {
        newStatus = 'paid'
        results.totalPaid++
      } else if (['rejected', 'denied'].includes(responseStatus)) {
        newStatus = 'rejected'
        results.totalRejected++
      } else if (responseStatus === 'error') {
        newStatus = 'error'
        results.totalErrors++
      } else {
        // Unknown status - mark as error
        newStatus = 'error'
        results.totalErrors++
        results.errors.push({
          transactionId,
          error: `Unknown status: ${responseStatus}`
        })
      }

      // Add note if amount mismatch
      let updatedNote = matchedTx.note || ''
      if (responseAmount !== null && Math.abs(parseFloat(matchedTx.amount as any) - responseAmount) > 0.01) {
        updatedNote = updatedNote 
          ? `${updatedNote}\n[Warning: Amount mismatch - Expected: $${matchedTx.amount}, Response: $${responseAmount}]`
          : `[Warning: Amount mismatch - Expected: $${matchedTx.amount}, Response: $${responseAmount}]`
      }

      transactionUpdates.push({
        id: transactionId,
        status: newStatus,
        note: updatedNote || undefined
      })
    }

    // Add notes for unmatched transactions in our system
    for (const tx of claimTransactions) {
      if (!transactionUpdates.find(update => update.id === tx.id)) {
        // This transaction wasn't in the response file
        const updatedNote = tx.note 
          ? `${tx.note}\n[Error: Unmatched during upload - not found in response file]`
          : '[Error: Unmatched during upload - not found in response file]'
        
        transactionUpdates.push({
          id: tx.id,
          status: 'error',
          note: updatedNote
        })
        results.totalErrors++
      }
    }

    // Update all transactions
    for (const update of transactionUpdates) {
      const updateData: any = { status: update.status }
      if (update.note) {
        updateData.note = update.note
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', update.id)

      if (updateError) {
        console.error('Error updating transaction:', update.id, updateError)
        results.errors.push({
          transactionId: update.id,
          error: updateError.message
        })
      }
    }

    // Determine claim status based on results
    let claimStatus: string
    if (results.totalPaid === claimTransactions.length) {
      claimStatus = 'paid' // All paid
    } else if (results.totalRejected === claimTransactions.length) {
      claimStatus = 'rejected' // All rejected
    } else if (results.totalPaid > 0 && (results.totalRejected > 0 || results.totalErrors > 0)) {
      claimStatus = 'partially_paid' // Mix of paid and rejected/errors
    } else {
      claimStatus = 'processed' // Processed but unclear outcome
    }

    // Update claim status
    const { error: claimUpdateError } = await supabase
      .from('claims')
      .update({
        status: claimStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', claimId)

    if (claimUpdateError) {
      console.error('Error updating claim status:', claimUpdateError)
    }

    // Create service role client for storage operations
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Upload response file to storage
    const timestamp = format(new Date(), 'yyyyMMdd-HHmm')
    const storedFileName = `RESPONSE-${claim.claim_number}-${timestamp}.csv`
    const responsePath = `exports/claims/${claim.claim_number}/responses/${storedFileName}`

    const { error: uploadError } = await supabaseService
      .storage
      .from('claim-exports')
      .upload(responsePath, fileContent, {
        contentType: 'text/csv',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading response file:', uploadError)
    }

    // Create reconciliation record
    const { error: reconError } = await supabase
      .from('claim_reconciliations')
      .insert({
        claim_id: claimId,
        uploaded_by: userId,
        file_name: file.name,
        file_path: uploadError ? null : responsePath,
        results_json: results,
        total_processed: results.totalProcessed,
        total_paid: results.totalPaid,
        total_rejected: results.totalRejected,
        total_errors: results.totalErrors,
        total_unmatched: results.totalUnmatched
      })

    if (reconError) {
      console.error('Error creating reconciliation record:', reconError)
    }

    // Log the action
    if (userId) {
      await logAction({
        userId,
        entityType: 'claim' as any,
        entityId: claimId,
        action: 'update',
        details: {
          action: 'claim_response_uploaded',
          claimNumber: claim.claim_number,
          fileName: file.name,
          results
        },
        ...metadata
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        claimStatus,
        results
      },
      message: `Response processed: ${results.totalPaid} paid, ${results.totalRejected} rejected, ${results.totalErrors} errors`
    })

  } catch (error) {
    console.error('Error processing claim response:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

