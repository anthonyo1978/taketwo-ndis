/**
 * Data Cleanup Utility
 * 
 * This utility helps clean up any corrupted or incompatible data
 * that might be causing build errors.
 */

/**
 * Clear all transaction data from localStorage
 * This will reset all transactions but preserve residents and houses
 */
export function clearAllTransactions(): void {
  if (typeof window === 'undefined') {
    return // Skip on server side
  }

  try {
    localStorage.removeItem('ndis_transactions')
    console.log('All transaction data cleared successfully')
  } catch (error) {
    console.error('Error clearing transaction data:', error)
  }
}

/**
 * Clear all data from localStorage (residents, houses, transactions)
 * Use with caution - this will reset the entire application
 */
export function clearAllData(): void {
  if (typeof window === 'undefined') {
    return // Skip on server side
  }

  try {
    localStorage.removeItem('ndis_residents')
    localStorage.removeItem('ndis_houses')
    localStorage.removeItem('ndis_transactions')
    console.log('All application data cleared successfully')
  } catch (error) {
    console.error('Error clearing application data:', error)
  }
}

/**
 * Export current data for backup before cleanup
 */
export function exportData(): { residents: any[]; houses: any[]; transactions: any[] } {
  if (typeof window === 'undefined') {
    return { residents: [], houses: [], transactions: [] }
  }

  try {
    const residents = JSON.parse(localStorage.getItem('ndis_residents') || '[]') as any[]
    const houses = JSON.parse(localStorage.getItem('ndis_houses') || '[]') as any[]
    const transactions = JSON.parse(localStorage.getItem('ndis_transactions') || '[]') as any[]
    
    return { residents, houses, transactions }
  } catch (error) {
    console.error('Error exporting data:', error)
    return { residents: [], houses: [], transactions: [] }
  }
}

/**
 * Import data from backup
 */
export function importData(data: { residents: any[]; houses: any[]; transactions: any[] }): void {
  if (typeof window === 'undefined') {
    return // Skip on server side
  }

  try {
    if (data.residents) {
      localStorage.setItem('ndis_residents', JSON.stringify(data.residents))
    }
    if (data.houses) {
      localStorage.setItem('ndis_houses', JSON.stringify(data.houses))
    }
    if (data.transactions) {
      localStorage.setItem('ndis_transactions', JSON.stringify(data.transactions))
    }
    console.log('Data imported successfully')
  } catch (error) {
    console.error('Error importing data:', error)
  }
}

/**
 * Check for data corruption and provide recommendations
 */
export function diagnoseDataIssues(): {
  hasIssues: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  if (typeof window === 'undefined') {
    return { hasIssues: false, issues: [], recommendations: [] }
  }

  try {
    // Check residents data
    const residentsData = localStorage.getItem('ndis_residents')
    if (residentsData) {
      try {
        JSON.parse(residentsData)
      } catch {
        issues.push('Residents data is corrupted')
        recommendations.push('Clear residents data and re-import')
      }
    }

    // Check houses data
    const housesData = localStorage.getItem('ndis_houses')
    if (housesData) {
      try {
        JSON.parse(housesData)
      } catch {
        issues.push('Houses data is corrupted')
        recommendations.push('Clear houses data and re-import')
      }
    }

    // Check transactions data
    const transactionsData = localStorage.getItem('ndis_transactions')
    if (transactionsData) {
      try {
        const transactions = JSON.parse(transactionsData)
        if (Array.isArray(transactions)) {
          // Check each transaction for required fields
          transactions.forEach((tx: any, index) => {
            if (!tx.id || !tx.residentId || !tx.contractId) {
              issues.push(`Transaction at index ${index} is missing required fields`)
            }
          })
        } else {
          issues.push('Transactions data is not an array')
          recommendations.push('Clear transactions data')
        }
      } catch {
        issues.push('Transactions data is corrupted')
        recommendations.push('Clear transactions data')
      }
    }

    if (issues.length === 0) {
      recommendations.push('Data appears to be healthy')
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      recommendations
    }
  } catch (error) {
    issues.push('Unable to diagnose data issues')
    recommendations.push('Clear all data and restart')
    return { hasIssues: true, issues, recommendations }
  }
}

// Make cleanup functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).dataCleanup = {
    clearAllTransactions,
    clearAllData,
    exportData,
    importData,
    diagnoseDataIssues
  }
  console.log('Data cleanup utilities available at window.dataCleanup')
}
