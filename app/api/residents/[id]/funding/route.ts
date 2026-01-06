import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fundingInformationSchema } from 'lib/schemas/resident'
import { residentService } from 'lib/supabase/services/residents'
import { createClient } from 'lib/supabase/server'

interface RouteParams {
  id: string
}

// GET /api/residents/[id]/funding - Get funding information for resident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    
    // Simulate realistic delay for loading states
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const resident = await residentService.getById(id)
    
    if (!resident) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Resident not found' 
        }, 
        { status: 404 }
      )
    }
    
    // Get funding contracts for this resident
    const fundingContracts = await residentService.getFundingContracts(id)
    
    return NextResponse.json({
      success: true,
      data: fundingContracts
    })
  } catch (error) {
    console.error('Error fetching funding information:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}

// POST /api/residents/[id]/funding - Add new funding information
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    
    // Validate funding information with contract fields
    const createFundingSchema = z.object({
      type: z.enum(['Draw Down', 'Capture & Invoice', 'Hybrid'] as const),
      amount: z.number()
        .min(0, "Funding amount must be positive")
        .max(999999.99, "Funding amount must be less than $1,000,000")
        .refine(val => Number.isFinite(val), "Invalid funding amount"),
      startDate: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      description: z.string()
        .max(200, "Description must be no more than 200 characters")
        .optional()
        .or(z.literal('')),
      isActive: z.boolean().default(true),
      drawdownRate: z.enum(['daily', 'weekly', 'monthly'] as const).default('monthly'),
      autoDrawdown: z.boolean().default(true),
      renewalDate: z.coerce.date().optional(),
      // Additional contract fields
      dailySupportItemCost: z.number().optional(),
      contractStatus: z.enum(['Draft', 'Active', 'Expired', 'Cancelled', 'Renewed'] as const).optional(),
      supportItemCode: z.string()
        .max(50, "Support item code must be no more than 50 characters")
        .optional()
        .or(z.literal('')),
      // Automation fields
      autoBillingEnabled: z.boolean().default(false),
      automatedDrawdownFrequency: z.enum(['daily', 'weekly', 'fortnightly'] as const).default('fortnightly'),
      nextRunDate: z.coerce.date().optional(),
      // Duration field (calculated from start/end dates)
      durationDays: z.number().int().positive().optional()
    }).refine(
      (data) => !data.endDate || data.startDate <= data.endDate,
      {
        message: "End date must be after start date",
        path: ["endDate"]
      }
    ).refine(
      (data) => !data.renewalDate || data.renewalDate > data.startDate,
      {
        message: "Renewal date must be after start date",
        path: ["renewalDate"]
      }
    ).refine(
      (data) => !data.autoBillingEnabled || data.nextRunDate,
      {
        message: "Next run date is required when automated billing is enabled",
        path: ["nextRunDate"]
      }
    ).refine(
      (data) => !data.nextRunDate || data.nextRunDate >= data.startDate,
      {
        message: "Next run date cannot be before contract start date",
        path: ["nextRunDate"]
      }
    )
    
    const validation = createFundingSchema.safeParse(body)
    
    if (!validation.success) {
      console.log('Validation failed:', validation.error.issues)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid funding information',
          details: validation.error.issues
        }, 
        { status: 400 }
      )
    }
    
    // Simulate realistic delay for loading states
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Calculate duration in days if both start and end dates are provided
    let durationDays: number | undefined = undefined
    if (validation.data.startDate && validation.data.endDate) {
      const timeDiff = validation.data.endDate.getTime() - validation.data.startDate.getTime()
      durationDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
    }
    
    // Create funding contract in Supabase
    const newFunding = await residentService.createFundingContract(id, {
      type: validation.data.type,
      amount: validation.data.amount,
      startDate: validation.data.startDate,
      endDate: validation.data.endDate,
      description: validation.data.description,
      isActive: validation.data.isActive,
      contractStatus: 'Draft',
      originalAmount: validation.data.amount,
      currentBalance: validation.data.amount,
      drawdownRate: validation.data.drawdownRate,
      autoDrawdown: validation.data.autoDrawdown,
      lastDrawdownDate: undefined,
      renewalDate: validation.data.renewalDate,
      parentContractId: undefined,
      supportItemCode: validation.data.supportItemCode,
      dailySupportItemCost: validation.data.dailySupportItemCost,
      // Automation fields
      autoBillingEnabled: validation.data.autoBillingEnabled,
      automatedDrawdownFrequency: validation.data.automatedDrawdownFrequency,
      nextRunDate: validation.data.nextRunDate,
      // Duration field
      durationDays: durationDays
    })
    
    return NextResponse.json({
      success: true,
      data: newFunding,
      message: 'Funding information added successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding funding information:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}

// PUT /api/residents/[id]/funding - Update existing funding information
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const bodyObj = body as { fundingId?: string; [key: string]: any }
    const { fundingId, ...fundingUpdates } = bodyObj
    
    if (!fundingId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Funding ID is required' 
        }, 
        { status: 400 }
      )
    }
    
    // Validate funding updates - create a partial schema manually
    const partialFundingSchema = z.object({
      type: z.enum(['Draw Down', 'Capture & Invoice', 'Hybrid'] as const).optional(),
      amount: z.number()
        .min(0, "Funding amount must be positive")
        .max(999999.99, "Funding amount must be less than $1,000,000")
        .refine(val => Number.isFinite(val), "Invalid funding amount")
        .optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      description: z.string()
        .max(200, "Description must be no more than 200 characters")
        .optional()
        .or(z.literal('')),
      isActive: z.boolean().optional(),
      contractStatus: z.enum(['Draft', 'Active', 'Expired', 'Cancelled', 'Renewed'] as const).optional(),
      originalAmount: z.number()
        .min(0, "Original amount must be positive")
        .max(999999.99, "Original amount must be less than $1,000,000")
        .refine(val => Number.isFinite(val), "Invalid original amount")
        .optional(),
      currentBalance: z.number()
        .min(0, "Current balance cannot be negative")
        .max(999999.99, "Current balance must be less than $1,000,000")
        .refine(val => Number.isFinite(val), "Invalid current balance")
        .optional(),
      drawdownRate: z.enum(['daily', 'weekly', 'monthly'] as const).optional(),
      autoDrawdown: z.boolean().optional(),
      lastDrawdownDate: z.coerce.date().optional(),
      renewalDate: z.coerce.date().optional(),
      parentContractId: z.string().optional(),
      supportItemCode: z.string()
        .max(50, "Support item code must be no more than 50 characters")
        .optional()
        .or(z.literal('')),
      dailySupportItemCost: z.number()
        .min(0, "Daily support item cost cannot be negative")
        .optional(),
      // Automation fields
      autoBillingEnabled: z.boolean().optional(),
      automatedDrawdownFrequency: z.enum(['daily', 'weekly', 'fortnightly'] as const).optional(),
      nextRunDate: z.coerce.date().optional(),
      // Duration field (calculated from start/end dates)
      durationDays: z.number().int().positive().optional()
    }).refine(
      (data) => !data.endDate || !data.startDate || data.startDate <= data.endDate,
      {
        message: "End date must be after start date",
        path: ["endDate"]
      }
    ).refine(
      (data) => !data.renewalDate || !data.startDate || data.renewalDate > data.startDate,
      {
        message: "Renewal date must be after start date",
        path: ["renewalDate"]
      }
    ).refine(
      (data) => !data.autoBillingEnabled || data.nextRunDate,
      {
        message: "Next run date is required when automated billing is enabled",
        path: ["nextRunDate"]
      }
    ).refine(
      (data) => !data.nextRunDate || !data.startDate || data.nextRunDate >= data.startDate,
      {
        message: "Next run date cannot be before contract start date",
        path: ["nextRunDate"]
      }
    )
    
    const validation = partialFundingSchema.safeParse(fundingUpdates)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid funding information',
          details: validation.error.issues
        }, 
        { status: 400 }
      )
    }
    
    // Simulate realistic delay for loading states
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Calculate duration in days if both start and end dates are provided
    let durationDays: number | undefined = undefined
    if (validation.data.startDate && validation.data.endDate) {
      const timeDiff = validation.data.endDate.getTime() - validation.data.startDate.getTime()
      durationDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
    }
    
    // Add duration to the update data
    const updateData = {
      ...validation.data,
      ...(durationDays !== undefined && { durationDays })
    }
    
    // Update funding contract in Supabase
    const updatedFunding = await residentService.updateFundingContract(fundingId, updateData)
    
    return NextResponse.json({
      success: true,
      data: updatedFunding,
      message: 'Funding information updated successfully'
    })
  } catch (error) {
    console.error('Error updating funding information:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}

// DELETE /api/residents/[id]/funding - Remove funding information
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const fundingId = searchParams.get('fundingId')
    
    if (!fundingId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Funding ID is required' 
        }, 
        { status: 400 }
      )
    }
    
    // Fetch the contract to validate it can be deleted
    const supabase = await createClient()
    const { data: contract, error: fetchError } = await supabase
      .from('funding_contracts')
      .select('id, original_amount, current_balance, contract_status')
      .eq('id', fundingId)
      .eq('resident_id', id)
      .single()
    
    if (fetchError || !contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      )
    }
    
    // Validation: Only allow deletion if no money has been drawn down
    const originalAmount = Number(contract.original_amount)
    const currentBalance = Number(contract.current_balance)
    const drawnDown = originalAmount - currentBalance
    
    if (drawnDown > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete contract: $${drawnDown.toFixed(2)} has been drawn down. Only contracts with no drawdowns can be deleted.`,
          drawnDown: drawnDown
        },
        { status: 400 }
      )
    }
    
    console.log(`[Contract Delete] Deleting contract ${fundingId} - No drawdowns detected`)
    
    // Simulate realistic delay for loading states
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Delete funding contract from Supabase
    await residentService.deleteFundingContract(fundingId)
    
    // Get updated funding contracts for the resident
    const updatedFundingContracts = await residentService.getFundingContracts(id)
    
    return NextResponse.json({
      success: true,
      data: updatedFundingContracts,
      message: 'Funding information removed successfully'
    })
  } catch (error) {
    console.error('Error removing funding information:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}