import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { renderContractPdf } from 'lib/contracts/renderer'
import { ndisServiceAgreementV1Schema } from 'lib/contracts/schemas/ndis-service-agreement-v1'
import { organizationService } from 'lib/supabase/services/organization'
import { createHash } from 'crypto'

/**
 * POST /api/contracts/:id/pdf
 * 
 * Generates a PDF contract for a funding contract
 * 
 * Flow:
 * 1. Load contract + resident + house data
 * 2. Load organization settings
 * 3. Build variables and validate with Zod
 * 4. Render PDF using @react-pdf/renderer
 * 5. Upload to Supabase Storage (exports bucket)
 * 6. Create audit record in rendered_documents
 * 7. Return signed URL (15 min expiry)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { id: contractId } = await params
    const supabase = await createClient()
    
    console.log(`[PDF API] Starting PDF generation for contract: ${contractId}`)
    
    // 1. Load contract with resident and house data
    const { data: contract, error: contractError } = await supabase
      .from('funding_contracts')
      .select(`
        *,
        resident:residents!inner(
          id,
          first_name,
          last_name,
          date_of_birth,
          ndis_id,
          phone,
          email,
          house_id,
          house:houses(
            id,
            descriptor,
            address1,
            unit,
            suburb,
            state,
            postcode,
            country
          )
        )
      `)
      .eq('id', contractId)
      .single()
    
    if (contractError || !contract) {
      console.error('[PDF API] Contract not found:', contractError)
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Contract not found' } },
        { status: 404 }
      )
    }
    
    // 2. Load organization settings
    const orgSettings = await organizationService.getByOrganizationId()
    
    if (!orgSettings) {
      console.error('[PDF API] Organization settings not found')
      return NextResponse.json(
        { error: { code: 'CONFIG_ERROR', message: 'Organization settings not configured' } },
        { status: 500 }
      )
    }
    
    // 3. Get timezone from automation settings
    const { data: automationSettings } = await supabase
      .from('automation_settings')
      .select('timezone')
      .eq('organization_id', '00000000-0000-0000-0000-000000000000')
      .single()
    
    const timezone = automationSettings?.timezone || 'Australia/Sydney'
    
    // 4. Calculate transaction totals (last 7d, 30d, 12m)
    const now = new Date()
    const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const date30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const date12m = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: txns7d } = await supabase
      .from('transactions')
      .select('amount')
      .eq('contract_id', contractId)
      .gte('occurred_at', date7d)
    
    const { data: txns30d } = await supabase
      .from('transactions')
      .select('amount')
      .eq('contract_id', contractId)
      .gte('occurred_at', date30d)
    
    const { data: txns12m } = await supabase
      .from('transactions')
      .select('amount')
      .eq('contract_id', contractId)
      .gte('occurred_at', date12m)
    
    const totals = {
      txns7d: txns7d?.length || 0,
      txns30d: txns30d?.length || 0,
      txns12m: txns12m?.length || 0,
      amount7d: txns7d?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      amount30d: txns30d?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      amount12m: txns12m?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
    }
    
    // 5. Build variables for template
    const vars = {
      provider: {
        name: orgSettings.organizationName,
        abn: orgSettings.abn,
        email: orgSettings.email,
        phone: orgSettings.phone,
        address: {
          line1: orgSettings.addressLine1,
          line2: orgSettings.addressLine2,
          suburb: orgSettings.suburb,
          state: orgSettings.state,
          postcode: orgSettings.postcode,
          country: orgSettings.country
        }
      },
      participant: {
        fullName: `${contract.resident.first_name} ${contract.resident.last_name}`,
        firstName: contract.resident.first_name,
        lastName: contract.resident.last_name,
        dateOfBirth: contract.resident.date_of_birth,
        ndisId: contract.resident.ndis_id,
        phone: contract.resident.phone,
        email: contract.resident.email
      },
      property: {
        name: contract.resident.house?.descriptor || 'Residential Property',
        address: contract.resident.house 
          ? `${contract.resident.house.address1}${contract.resident.house.unit ? `, ${contract.resident.house.unit}` : ''}, ${contract.resident.house.suburb}, ${contract.resident.house.state} ${contract.resident.house.postcode}`
          : 'Address not available',
        fullAddress: contract.resident.house
          ? `${contract.resident.house.address1}${contract.resident.house.unit ? `, ${contract.resident.house.unit}` : ''}, ${contract.resident.house.suburb}, ${contract.resident.house.state} ${contract.resident.house.postcode}, ${contract.resident.house.country}`
          : undefined
      },
      agreement: {
        contractId: contract.id,
        type: contract.type || 'NDIS Funding',
        startDate: contract.start_date,
        endDate: contract.end_date,
        totalAmount: Number(contract.original_amount),
        currentBalance: Number(contract.current_balance),
        dailyRate: Number(contract.daily_support_item_cost || 0),
        frequency: contract.automated_drawdown_frequency,
        durationDays: contract.duration_days
      },
      totals,
      generatedAt: new Date().toISOString(),
      timezone
    }
    
    console.log('[PDF API] Variables built, validating...')
    
    // 6. Validate variables against schema
    const validation = ndisServiceAgreementV1Schema.safeParse(vars)
    
    if (!validation.success) {
      console.error('[PDF API] Validation failed:', validation.error.issues)
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Missing required contract data',
            issues: validation.error.issues 
          } 
        },
        { status: 400 }
      )
    }
    
    console.log('[PDF API] Validation passed, rendering PDF...')
    
    // 7. Render PDF
    const renderResult = await renderContractPdf({
      templateId: 'ndis_service_agreement',
      version: 'v1',
      vars: validation.data
    })
    
    if (!renderResult.success || !renderResult.buffer) {
      console.error('[PDF API] Render failed:', renderResult.error)
      return NextResponse.json(
        { error: { code: 'RENDER_FAILED', message: renderResult.error || 'PDF rendering failed' } },
        { status: 500 }
      )
    }
    
    console.log(`[PDF API] PDF rendered successfully in ${renderResult.renderMs}ms`)
    
    // 8. Upload to Supabase Storage
    const timestamp = Date.now()
    const storagePath = `contracts/${contractId}/ndis_service_agreement-v1-${timestamp}.pdf`
    
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(storagePath, renderResult.buffer, {
        contentType: 'application/pdf',
        upsert: false
      })
    
    if (uploadError) {
      console.error('[PDF API] Storage upload failed:', uploadError)
      return NextResponse.json(
        { error: { code: 'STORAGE_WRITE_FAILED', message: 'Failed to save PDF' } },
        { status: 503 }
      )
    }
    
    console.log(`[PDF API] PDF uploaded to storage: ${storagePath}`)
    
    // 9. Generate signed URL (15 min expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('exports')
      .createSignedUrl(storagePath, 60 * 15) // 15 minutes
    
    if (signedUrlError || !signedUrlData) {
      console.error('[PDF API] Failed to create signed URL:', signedUrlError)
      return NextResponse.json(
        { error: { code: 'SIGNED_URL_FAILED', message: 'Failed to create download link' } },
        { status: 500 }
      )
    }
    
    // 10. Create audit record
    const dataHash = createHash('sha256').update(JSON.stringify(validation.data)).digest('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    
    const { data: document, error: documentError } = await supabase
      .from('rendered_documents')
      .insert({
        organization_id: '00000000-0000-0000-0000-000000000000',
        contract_id: contractId,
        resident_id: contract.resident.id,
        template_id: 'ndis_service_agreement',
        template_version: 'v1',
        storage_path: storagePath,
        signed_url_last: signedUrlData.signedUrl,
        signed_url_expires_at: expiresAt,
        data_hash_sha256: dataHash,
        render_ms: renderResult.renderMs,
        file_size_bytes: renderResult.buffer.length,
        rendered_by_user_id: 'system', // TODO: Get from auth
        rendered_by_user_email: 'system@taketwo.com.au'
      })
      .select()
      .single()
    
    if (documentError) {
      console.error('[PDF API] Failed to create document record:', documentError)
      // Don't fail the request - PDF is already generated
    }
    
    const totalTime = Date.now() - startTime
    console.log(`[PDF API] Complete in ${totalTime}ms`)
    
    // 11. Return success response
    return NextResponse.json({
      success: true,
      documentId: document?.id,
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      expiresAt,
      renderMs: renderResult.renderMs,
      fileSizeBytes: renderResult.buffer.length
    })
    
  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[PDF API] Fatal error after ${totalTime}ms:`, error)
    
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: error instanceof Error ? error.message : 'Internal server error' 
        } 
      },
      { status: 500 }
    )
  }
}

