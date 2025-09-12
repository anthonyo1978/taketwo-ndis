// Mock ID generator for Transaction entities
// Format: T-<yyyy>-<sequence>
// Example: T-2024-001, T-2024-002, etc.

let currentSequence = 0

const STORAGE_KEY = 'transaction_id_sequence'

// Initialize sequence from localStorage
const initializeSequence = (): number => {
  if (typeof window === 'undefined') return 0
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? parseInt(stored, 10) : 0
  } catch {
    return 0
  }
}

// Store sequence to localStorage
const storeSequence = (sequence: number): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, sequence.toString())
  } catch {
    // Ignore localStorage errors
  }
}

// Initialize on module load
currentSequence = initializeSequence()

export const generateId = (): string => {
  const year = new Date().getFullYear()
  currentSequence += 1
  
  // Store the new sequence value
  storeSequence(currentSequence)
  
  // Format with leading zeros (3 digits)
  const sequence = currentSequence.toString().padStart(3, '0')
  
  return `T-${year}-${sequence}`
}

export const resetSequenceForTesting = (): void => {
  currentSequence = 0
  storeSequence(0)
}

// Get current sequence for testing/debugging
export const getCurrentSequence = (): number => {
  return currentSequence
}
