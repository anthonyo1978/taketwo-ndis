"use client"

import { useEffect } from 'react'
import { autoMigrateTransactions } from 'lib/utils/transaction-migration'
import { autoMigrateResidents } from 'lib/utils/resident-migration'
import { diagnoseDataIssues } from 'lib/utils/data-cleanup'

/**
 * Client-side component to handle transaction migration
 * This runs once when the app loads to ensure backward compatibility
 */
export function TransactionMigration() {
  useEffect(() => {
    // Run migrations on client side only
    autoMigrateResidents()
    autoMigrateTransactions()
    
    // Diagnose data issues in development
    if (process.env.NODE_ENV === 'development') {
      const diagnosis = diagnoseDataIssues()
      if (diagnosis.hasIssues) {
        console.warn('Data issues detected:', diagnosis.issues)
        console.log('Recommendations:', diagnosis.recommendations)
        console.log('Use window.dataCleanup to fix issues if needed')
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}
