import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fundingInformationSchema } from 'lib/schemas/resident'
import { residentService } from 'lib/supabase/services/residents'

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
        .or(z.literal(''))
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
      supportItemCode: undefined,
      dailySupportItemCost: undefined
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
    const { fundingId, ...fundingUpdates } = body
    
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
        .optional()
    })
    
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
    
    // Update funding contract in Supabase
    const updatedFunding = await residentService.updateFundingContract(fundingId, validation.data)
    
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