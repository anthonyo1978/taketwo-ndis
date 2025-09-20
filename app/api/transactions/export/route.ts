import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  getTransactionsList,
  getTransactionById 
} from 'lib/utils/transaction-storage'
import { getResidentsFromStorage } from 'lib/utils/resident-storage'
import { getHousesFromStorage } from 'lib/utils/house-storage'
import type { TransactionFilters, TransactionSortConfig } from 'types/transaction'

// Validation schema for export parameters
const exportParamsSchema = z.object({
  format: z.enum(['csv']).default('csv'),
  transactionIds: z.string().optional(), // Comma-separated for specific transactions
  // Filter parameters (same as transaction list)
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  residentIds: z.string().optional(),
  contractIds: z.string().optional(),
  houseIds: z.string().optional(),
  statuses: z.string().optional(),
  serviceCode: z.string().optional(),
  search: z.string().optional(),
  // Sort parameters
  sortField: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
})

/**
 * Escape CSV values to prevent injection and formatting issues.
 * 
 * @param value - The value to escape
 * @returns Properly escaped CSV value
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return ''
  
  const stringValue = String(value)
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Format date for CSV export in YYYY-MM-DD format.
 * 
 * @param date - The date to format
 * @returns Formatted date string or empty string if invalid
 */
function formatDateForCSV(date: Date | string | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString().split('T')[0]! // YYYY-MM-DD format
}

/**
 * Format datetime for CSV export in YYYY-MM-DD HH:mm:ss format.
 * 
 * @param date - The datetime to format
 * @returns Formatted datetime string or empty string if invalid
 */
function formatDateTimeForCSV(date: Date | string | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString().replace('T', ' ').split('.')[0]! // YYYY-MM-DD HH:mm:ss format
}

/**
 * Export transactions as CSV file.
 * 
 * @param request - The Next.js request object with query parameters
 * @returns CSV file download or error response
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate parameters
    const params = {
      format: searchParams.get('format') || 'csv',
      transactionIds: searchParams.get('transactionIds'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      residentIds: searchParams.get('residentIds'),
      contractIds: searchParams.get('contractIds'),
      houseIds: searchParams.get('houseIds'),
      statuses: searchParams.get('statuses'),
      serviceCode: searchParams.get('serviceCode'),
      search: searchParams.get('search'),
      sortField: searchParams.get('sortField'),
      sortDirection: searchParams.get('sortDirection')
    }
    
    const result = exportParamsSchema.safeParse(params)
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid export parameters',
          details: result.error.errors
        },
        { status: 400 }
      )
    }
    
    const validParams = result.data
    
    let transactions
    
    if (validParams.transactionIds) {
      // Export specific transactions
      const ids = validParams.transactionIds.split(',').filter(Boolean)
      transactions = ids.map(id => getTransactionById(id)).filter(Boolean)
    } else {
      // Export filtered transactions
      const filters: TransactionFilters = {}
      
      if (validParams.dateFrom && validParams.dateTo) {
        filters.dateRange = {
          from: validParams.dateFrom,
          to: validParams.dateTo
        }
      }
      if (validParams.residentIds) {
        filters.residentIds = validParams.residentIds.split(',').filter(Boolean)
      }
      if (validParams.contractIds) {
        filters.contractIds = validParams.contractIds.split(',').filter(Boolean)
      }
      if (validParams.houseIds) {
        filters.houseIds = validParams.houseIds.split(',').filter(Boolean)
      }
      if (validParams.statuses) {
        filters.statuses = validParams.statuses.split(',') as any
      }
      if (validParams.serviceCode) {
        filters.serviceCode = validParams.serviceCode
      }
      if (validParams.search) {
        filters.search = validParams.search
      }
      
      const sort: TransactionSortConfig = {
        field: (validParams.sortField as any) || 'occurredAt',
        direction: validParams.sortDirection || 'desc'
      }
      
      // Get all matching transactions (no pagination for export)
      const listResult = getTransactionsList(filters, sort, 1, 10000)
      transactions = listResult.transactions
    }
    
    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transactions found for export' },
        { status: 404 }
      )
    }
    
    // Get lookup data
    const residents = getResidentsFromStorage()
    const houses = getHousesFromStorage()
    
    // Create lookups for performance
    const residentLookup = new Map(residents.map(r => [r.id, r]))
    const houseLookup = new Map(houses.map(h => [h.id, h]))
    const contractLookup = new Map()
    
    residents.forEach(resident => {
      resident.fundingInformation.forEach(contract => {
        contractLookup.set(contract.id, { ...contract, residentId: resident.id })
      })
    })
    
    // Generate CSV content
    const csvHeaders = [
      'Transaction ID',
      'Date Occurred',
      'Resident Name',
      'House Name', 
      'Contract Type',
      'Service Code',
      'Description',
      'Quantity',
      'Unit Price',
      'Amount',
      'Status',
      'Note',
      'Created Date',
      'Created By',
      'Posted Date',
      'Posted By',
      'Voided Date',
      'Voided By',
      'Void Reason'
    ]
    
    const csvRows = transactions.map(tx => {
      const resident = residentLookup.get(tx.residentId)
      const contract = contractLookup.get(tx.contractId)
      const house = resident ? houseLookup.get(resident.houseId) : null
      
      return [
        escapeCSVValue(tx.id),
        escapeCSVValue(formatDateForCSV(tx.occurredAt)),
        escapeCSVValue(resident ? `${resident.firstName} ${resident.lastName}` : 'Unknown'),
        escapeCSVValue(house?.descriptor || 'Unknown'),
        escapeCSVValue(contract?.type || 'Unknown'),
        escapeCSVValue(tx.serviceCode),
        escapeCSVValue(tx.note || ''),
        escapeCSVValue(tx.quantity),
        escapeCSVValue(tx.unitPrice.toFixed(2)),
        escapeCSVValue(tx.amount.toFixed(2)),
        escapeCSVValue(tx.status.charAt(0).toUpperCase() + tx.status.slice(1)),
        escapeCSVValue(tx.note || ''),
        escapeCSVValue(formatDateTimeForCSV(tx.createdAt)),
        escapeCSVValue(tx.createdBy),
        escapeCSVValue(formatDateTimeForCSV(tx.postedAt)),
        escapeCSVValue(tx.postedBy || ''),
        escapeCSVValue(formatDateTimeForCSV(tx.voidedAt)),
        escapeCSVValue(tx.voidedBy || ''),
        escapeCSVValue(tx.voidReason || '')
      ]
    })
    
    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `transactions-export-${timestamp}.csv`
    
    // Add delay for loading state demonstration
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('Error exporting transactions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}