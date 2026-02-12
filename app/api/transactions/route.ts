import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { transactionService } from 'lib/supabase/services/transactions'
import { processDrawdownTransaction } from 'lib/utils/drawdown-validation'
import { getTransactionBalancePreview } from 'lib/utils/transaction-storage'
import { getCurrentUserId, logAction, getRequestMetadata } from 'lib/services/audit-logger'
import type { 
  Transaction,
  TransactionCreateInput, 
  TransactionFilters, 
  TransactionSortConfig 
} from 'types/transaction'

// Validation schema for creating transactions
const createTransactionSchema = z.object({
  residentId: z.string().min(1, 'Resident ID is required'),
  contractId: z.string().min(1, 'Contract ID is required'),
  occurredAt: z.coerce.date(),
  serviceCode: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  amount: z.number().nonnegative().optional(),
  note: z.string().optional(),
  // Drawing Down specific fields
  serviceItemCode: z.string().optional(),
  supportAgreementId: z.string().optional(),
  isDrawdownTransaction: z.boolean().optional()
})

// Validation schema for filters
const filtersSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  residentIds: z.string().optional(), // Comma-separated
  contractIds: z.string().optional(), // Comma-separated
  houseIds: z.string().optional(), // Comma-separated
  statuses: z.string().optional(), // Comma-separated
  serviceCode: z.string().optional(),
  search: z.string().optional()
}).optional()

// Validation schema for sorting
const sortSchema = z.object({
  field: z.enum([
    'id', 'occurredAt', 'amount', 'status', 'serviceCode', 
    'createdAt', 'residentName', 'houseName', 'contractType'
  ]).default('id'),
  direction: z.enum(['asc', 'desc']).default('desc')
}).optional()

// GET /api/transactions - List transactions with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)), 100)
    
    // Parse and validate filters - convert null to undefined
    const rawFilters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      residentIds: searchParams.get('residentIds') || undefined,
      contractIds: searchParams.get('contractIds') || undefined,
      houseIds: searchParams.get('houseIds') || undefined,
      statuses: searchParams.get('statuses') || undefined,
      serviceCode: searchParams.get('serviceCode') || undefined,
      search: searchParams.get('search') || undefined
    }
    
    const filtersResult = filtersSchema.safeParse(rawFilters)
    if (!filtersResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid filter parameters',
          details: filtersResult.error.errors
        },
        { status: 400 }
      )
    }
    
    // Convert to TransactionFilters format
    const filters: TransactionFilters = {}
    if (filtersResult.data?.dateFrom && filtersResult.data?.dateTo) {
      filters.dateRange = {
        from: filtersResult.data.dateFrom,
        to: filtersResult.data.dateTo
      }
    }
    if (filtersResult.data?.residentIds) {
      filters.residentIds = filtersResult.data.residentIds.split(',').filter(Boolean)
    }
    if (filtersResult.data?.contractIds) {
      filters.contractIds = filtersResult.data.contractIds.split(',').filter(Boolean)
    }
    if (filtersResult.data?.houseIds) {
      filters.houseIds = filtersResult.data.houseIds.split(',').filter(Boolean)
    }
    if (filtersResult.data?.statuses) {
      filters.statuses = filtersResult.data.statuses.split(',') as any
    }
    if (filtersResult.data?.serviceCode) {
      filters.serviceCode = filtersResult.data.serviceCode
    }
    if (filtersResult.data?.search) {
      filters.search = filtersResult.data.search
    }
    
    // Parse and validate sorting
    const rawSort = {
      field: searchParams.get('sortField') || 'id',
      direction: searchParams.get('sortDirection') || 'desc'
    }
    
    const sortResult = sortSchema.safeParse(rawSort)
    if (!sortResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid sort parameters',
          details: sortResult.error.errors
        },
        { status: 400 }
      )
    }
    
    const sort: TransactionSortConfig = sortResult.data || { field: 'id', direction: 'desc' }
    
    // Get transactions from database
    const result = await transactionService.getAll(filters, sort, page, pageSize)
    
    return NextResponse.json({
      success: true,
      data: result.transactions,
      pagination: {
        page: result.page,
        limit: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
        hasNext: result.hasMore,
        hasPrev: result.page > 1
      }
    })
    
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      residentId?: string
      contractId?: string
      occurredAt?: string
      serviceCode?: string
      description?: string
      quantity?: number
      unitPrice?: number
      amount?: number
      note?: string
      serviceItemCode?: string
      supportAgreementId?: string
      isDrawdownTransaction?: boolean
    }
    
    // Validate input
    const result = createTransactionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid transaction data',
          details: result.error.errors
        },
        { status: 400 }
      )
    }
    
    const input = result.data as TransactionCreateInput
    
    // Get current user ID for logging
    const userId = await getCurrentUserId()
    const metadata = getRequestMetadata(request)
    
    // Check if this is a Drawing Down transaction
    if (input.isDrawdownTransaction) {
      // Use the complete Drawing Down workflow
      const result = await processDrawdownTransaction(input, userId || 'system')
      
      if (!result.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Drawing Down transaction failed',
            details: result.errors
          },
          { status: 400 }
        )
      }
      
      // Log the action
      if (userId && result.transaction) {
        await logAction({
          userId,
          entityType: 'transaction',
          entityId: result.transaction.id,
          action: 'create',
          details: {
            residentId: input.residentId,
            contractId: input.contractId,
            amount: input.amount || (input.quantity * input.unitPrice),
            type: 'drawdown'
          },
          ...metadata
        })
      }
      
      // Get balance preview for the posted transaction
      const balancePreview = getTransactionBalancePreview(
        input.contractId,
        input.amount || (input.quantity * input.unitPrice)
      )
      
      return NextResponse.json({
        success: true,
        data: result.transaction,
        balancePreview
      }, { status: 201 })
    } else {
      // Regular transaction creation - use database service
      const transaction = await transactionService.create(input, userId || 'system')
      

      
      // Log the action
      if (userId) {
        await logAction({
          userId,
          entityType: 'transaction',
          entityId: transaction.id,
          action: 'create',
          details: {
            residentId: input.residentId,
            contractId: input.contractId,
            amount: input.amount || (input.quantity * input.unitPrice),
            type: 'manual'
          },
          ...metadata
        })
      }
      
      return NextResponse.json({
        success: true,
        data: transaction
      }, { status: 201 })
    }
    
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}