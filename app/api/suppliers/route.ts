import { NextRequest, NextResponse } from 'next/server'
import { supplierService } from 'lib/supabase/services/suppliers'
import type { SupplierCreateInput } from 'types/supplier'

/**
 * GET /api/suppliers - Get all suppliers for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const suppliers = await supplierService.getAll()
    return NextResponse.json({ success: true, data: suppliers })
  } catch (error) {
    console.error('[API] Error fetching suppliers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/suppliers - Create a new supplier
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SupplierCreateInput
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    // Basic email validation if provided
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supplier = await supplierService.create(body)
    return NextResponse.json({ success: true, data: supplier }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating supplier:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}

