/** Status options for claims. */
export type ClaimStatus = 'draft' | 'submitted' | 'paid' | 'rejected'

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

