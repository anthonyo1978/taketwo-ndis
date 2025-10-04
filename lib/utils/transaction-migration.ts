/**
 * Transaction Migration Utility
 * 
 * This utility helps migrate existing transaction data to include the new Drawing Down fields
 * for backward compatibility.
 */

import type { Transaction } from 'types/transaction'

/**
 * Migrate a transaction to include Drawing Down fields with safe defaults
 */
export function migrateTransaction(transaction: Record<string, unknown>): Transaction {
  return {
    ...transaction,
    // Ensure required fields have safe defaults
    id: (transaction.id as string) || 'migrated-transaction-' + Date.now(),
    residentId: (transaction.residentId as string) || 'unknown',
    contractId: (transaction.contractId as string) || 'unknown',
    quantity: (transaction.quantity as number) || 1,
    unitPrice: (transaction.unitPrice as number) || 0,
    amount: (transaction.amount as number) || 0,
    status: (transaction.status as 'draft' | 'posted' | 'voided') || 'posted',
    createdBy: (transaction.createdBy as string) || 'system',
    serviceCode: (transaction.serviceCode as string) || 'LEGACY',
    drawdownStatus: (transaction.drawdownStatus as 'pending' | 'validated' | 'posted' | 'rejected' | 'voided') || 'posted', // Assume existing transactions are posted
    participantId: (transaction.participantId as string) || (transaction.residentId as string),
    serviceItemCode: (transaction.serviceItemCode as string) || undefined,
    isDrawdownTransaction: (transaction.isDrawdownTransaction as boolean) || false,
    auditTrail: (transaction.auditTrail as any[]) || [],
    // Ensure dates are proper Date objects
    occurredAt: new Date(transaction.occurredAt as string),
    createdAt: new Date(transaction.createdAt as string),
    postedAt: transaction.postedAt ? new Date(transaction.postedAt as string) : undefined,
    voidedAt: transaction.voidedAt ? new Date(transaction.voidedAt as string) : undefined
  }
}

/**
 * Migrate all transactions in storage to include Drawing Down fields
 */
export function migrateAllTransactions(): void {
  if (typeof window === 'undefined') {
    return // Skip on server side
  }

  try {
    const stored = localStorage.getItem('ndis_transactions')
    if (!stored) return

    const transactions = JSON.parse(stored) as Record<string, unknown>[]
    const migratedTransactions = transactions.map(migrateTransaction)
    
    localStorage.setItem('ndis_transactions', JSON.stringify(migratedTransactions))
    console.log(`Migrated ${migratedTransactions.length} transactions to Drawing Down format`)
  } catch (error) {
    console.error('Error migrating transactions:', error)
  }
}

/**
 * Check if a transaction needs migration
 */
export function needsMigration(transaction: any): boolean {
  return !transaction.hasOwnProperty('drawdownStatus') || 
         !transaction.hasOwnProperty('participantId') ||
         !transaction.hasOwnProperty('auditTrail')
}

/**
 * Auto-migrate transactions when the app loads
 */
export function autoMigrateTransactions(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const stored = localStorage.getItem('ndis_transactions')
    if (!stored) return

    const transactions = JSON.parse(stored) as any[]
    const needsMigrationCount = transactions.filter(needsMigration).length
    
    if (needsMigrationCount > 0) {
      console.log(`Found ${needsMigrationCount} transactions that need migration`)
      migrateAllTransactions()
    }
  } catch (error) {
    console.error('Error checking transaction migration status:', error)
  }
}
