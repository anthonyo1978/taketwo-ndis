/** Status options for claims. */
export type ClaimStatus = 'draft' | 'in_progress' | 'processed' | 'submitted' | 'paid' | 'rejected' | 'partially_paid'

/**
 * Claim record for bulk transaction claiming
 */
export interface Claim {
  id: string
  claimNumber: string  // CLM-0000001
  createdBy: string
  createdAt: Date
  filtersJson?: Record<string, any>  // Filters used to create claim
  transactionCount: number
  totalAmount: number
  status: ClaimStatus
  submittedAt?: Date
  submittedBy?: string
  updatedAt: Date
  filePath?: string  // Path to latest generated CSV file
  fileGeneratedAt?: Date  // When file was last generated
  fileGeneratedBy?: string  // User ID who generated the file
}

/**
 * Input for creating a new claim
 */
export interface ClaimCreateInput {
  residentId?: string  // Optional filter by resident
  dateFrom?: Date      // Optional date range start
  dateTo?: Date        // Optional date range end
  includeAll?: boolean // Include all eligible transactions
}

/**
 * Claim with linked transactions
 */
export interface ClaimWithTransactions extends Claim {
  transactions: Array<{
    id: string
    residentName: string
    occurredAt: Date
    amount: number
    serviceCode?: string
    note?: string
  }>
}

/**
 * Claim reconciliation record for response file uploads
 */
export interface ClaimReconciliation {
  id: string
  claimId: string
  uploadedBy: string
  fileName: string
  filePath?: string
  resultsJson: {
    totalProcessed: number
    totalPaid: number
    totalRejected: number
    totalErrors: number
    totalUnmatched: number
    amountMismatches?: Array<{
      transactionId: string
      expectedAmount: number
      responseAmount: number
    }>
    unmatchedIds?: string[]
    errors?: Array<{
      transactionId: string
      error: string
    }>
  }
  totalProcessed: number
  totalPaid: number
  totalRejected: number
  totalErrors: number
  totalUnmatched: number
  createdAt: Date
  updatedAt: Date
}

