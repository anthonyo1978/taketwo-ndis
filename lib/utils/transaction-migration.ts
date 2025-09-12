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
    serviceCode: transaction.serviceCode || 'LEGACY',
    drawdownStatus: transaction.drawdownStatus || 'posted', // Assume existing transactions are posted
    participantId: transaction.participantId || transaction.residentId,
    serviceItemCode: transaction.serviceItemCode || undefined,
    isDrawdownTransaction: transaction.isDrawdownTransaction || false,
    auditTrail: transaction.auditTrail || [],
    // Ensure dates are proper Date objects
    occurredAt: new Date(transaction.occurredAt),
    createdAt: new Date(transaction.createdAt),
    postedAt: transaction.postedAt ? new Date(transaction.postedAt) : undefined,
    voidedAt: transaction.voidedAt ? new Date(transaction.voidedAt) : undefined
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

    const transactions = JSON.parse(stored)
    const needsMigrationCount = transactions.filter(needsMigration).length
    
    if (needsMigrationCount > 0) {
      console.log(`Found ${needsMigrationCount} transactions that need migration`)
      migrateAllTransactions()
    }
  } catch (error) {
    console.error('Error checking transaction migration status:', error)
  }
}
