import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * PUT /api/residents/:id/funding/:contractId/status
 * 
 * Updates the status of a funding contract (e.g., Draft → Active)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contractId: string }> }
) {
  try {
    const { id: residentId, contractId } = await params
    const body = await request.json() as { status: string }
    
    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Verify contract exists and belongs to this resident
    const { data: contract, error: fetchError } = await supabase
      .from('funding_contracts')
      .select('id, resident_id, contract_status')
      .eq('id', contractId)
      .eq('resident_id', residentId)
      .single()
    
    if (fetchError || !contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      )
    }
    
    // Validate status transition
    const validStatuses = ['Draft', 'Active', 'Expired', 'Cancelled', 'Renewed']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${body.status}` },
        { status: 400 }
      )
    }
    
    console.log(`[Contract Status] Updating contract ${contractId} from ${contract.contract_status} to ${body.status}`)
    
    // Update contract status
    const { error: updateError } = await supabase
      .from('funding_contracts')
      .update({
        contract_status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId)
    
    if (updateError) {
      console.error('[Contract Status] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update contract status' },
        { status: 500 }
      )
    }
    
    // Fetch updated funding information for the resident
    const { data: updatedContracts, error: contractsError } = await supabase
      .from('funding_contracts')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
    
    if (contractsError) {
      console.error('[Contract Status] Error fetching updated contracts:', contractsError)
    }
    
    // Convert to FundingInformation format
    const fundingInfo = (updatedContracts || []).map((fc: any) => ({
      id: fc.id,
      type: fc.type,
      amount: Number(fc.original_amount),
      originalAmount: Number(fc.original_amount),
      currentBalance: Number(fc.current_balance),
      startDate: fc.start_date,
      endDate: fc.end_date,
      description: fc.description,
      isActive: fc.contract_status === 'Active',
      contractStatus: fc.contract_status,
      drawdownRate: fc.drawdown_rate,
      autoDrawdown: fc.auto_drawdown,
      lastDrawdownDate: fc.last_drawdown_date,
      renewalDate: fc.renewal_date,
      parentContractId: fc.parent_contract_id,
      supportItemCode: fc.support_item_code,
      dailySupportItemCost: fc.daily_support_item_cost ? Number(fc.daily_support_item_cost) : undefined,
      durationDays: fc.duration_days,
      autoBillingEnabled: fc.auto_billing_enabled || false,
      automatedDrawdownFrequency: fc.automated_drawdown_frequency || 'fortnightly',
      firstRunDate: fc.first_run_date,
      nextRunDate: fc.next_run_date,
      lastRunDate: fc.last_run_date
    }))
    
    console.log(`[Contract Status] Contract ${contractId} updated to ${body.status}`)
    
    return NextResponse.json({
      success: true,
      data: fundingInfo
    })
    
  } catch (error) {
    console.error('[Contract Status] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

