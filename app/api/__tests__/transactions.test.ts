import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../transactions/route'
import { 
  getTransactionsList, 
  createTransaction, 
  getTransactionBalancePreview,
  getTransactionsFromStorage,
  saveTransactionsToStorage
} from '@/lib/utils/transaction-storage'
import { generateId as generateTransactionId } from '@/lib/utils/transaction-id-generator'
import { processDrawdownTransaction } from '@/lib/utils/drawdown-validation'

// Mock the transaction utilities
vi.mock('@/lib/utils/transaction-storage', () => ({
  getTransactionsList: vi.fn(),
  createTransaction: vi.fn(),
  getTransactionBalancePreview: vi.fn(),
  getTransactionsFromStorage: vi.fn(),
  saveTransactionsToStorage: vi.fn()
}))

vi.mock('@/lib/utils/transaction-id-generator', () => ({
  generateId: vi.fn()
}))

vi.mock('@/lib/utils/drawdown-validation', () => ({
  processDrawdownTransaction: vi.fn()
}))

describe('Transactions API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/transactions', () => {
    it('should return transactions with default pagination', async () => {
      const mockTransactions = {
        transactions: [
          {
            id: 'txn-1',
            residentId: 'resident-1',
            contractId: 'contract-1',
            occurredAt: '2024-01-01T00:00:00.000Z',
            serviceCode: 'SERVICE001',
            description: 'Test service',
            quantity: 1,
            unitPrice: 100,
            amount: 100,
            status: 'draft',
            note: 'Test note',
            createdAt: '2024-01-01T00:00:00.000Z',
            createdBy: 'admin',
            auditTrail: []
          }
        ],
        pagination: {
          page: 1,
          pageSize: 25,
          total: 1,
          totalPages: 1
        }
      }

      vi.mocked(getTransactionsList).mockReturnValue(mockTransactions)

      const request = new Request('http://localhost:3000/api/transactions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: mockTransactions })
      expect(getTransactionsList).toHaveBeenCalledWith(
        {},
        { field: 'occurredAt', direction: 'desc' },
        1,
        25
      )
    })

    it('should handle pagination parameters', async () => {
      const mockTransactions = {
        transactions: [],
        pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 }
      }

      vi.mocked(getTransactionsList).mockReturnValue(mockTransactions)

      const request = new Request('http://localhost:3000/api/transactions?page=2&pageSize=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(getTransactionsList).toHaveBeenCalledWith(
        {},
        { field: 'occurredAt', direction: 'desc' },
        2,
        10
      )
    })

    it('should handle date range filters', async () => {
      const mockTransactions = {
        transactions: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 }
      }

      vi.mocked(getTransactionsList).mockReturnValue(mockTransactions)

      const request = new Request('http://localhost:3000/api/transactions?dateFrom=2024-01-01&dateTo=2024-01-31')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(getTransactionsList).toHaveBeenCalledWith(
        {
          dateRange: {
            from: new Date('2024-01-01'),
            to: new Date('2024-01-31')
          }
        },
        { field: 'occurredAt', direction: 'desc' },
        1,
        25
      )
    })

    it('should handle multiple filter parameters', async () => {
      const mockTransactions = {
        transactions: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 }
      }

      vi.mocked(getTransactionsList).mockReturnValue(mockTransactions)

      const request = new Request('http://localhost:3000/api/transactions?residentIds=resident-1,resident-2&contractIds=contract-1&statuses=draft,posted&serviceCode=SERVICE001&search=test')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(getTransactionsList).toHaveBeenCalledWith(
        {
          residentIds: ['resident-1', 'resident-2'],
          contractIds: ['contract-1'],
          statuses: ['draft', 'posted'],
          serviceCode: 'SERVICE001',
          search: 'test'
        },
        { field: 'occurredAt', direction: 'desc' },
        1,
        25
      )
    })

    it('should handle custom sorting', async () => {
      const mockTransactions = {
        transactions: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 }
      }

      vi.mocked(getTransactionsList).mockReturnValue(mockTransactions)

      const request = new Request('http://localhost:3000/api/transactions?sortField=amount&sortDirection=asc')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(getTransactionsList).toHaveBeenCalledWith(
        {},
        { field: 'amount', direction: 'asc' },
        1,
        25
      )
    })

    it('should handle invalid filter parameters', async () => {
      const request = new Request('http://localhost:3000/api/transactions?dateFrom=invalid-date')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid filter parameters')
      expect(data.details).toBeDefined()
    })

    it('should handle invalid sort parameters', async () => {
      const request = new Request('http://localhost:3000/api/transactions?sortField=invalidField&sortDirection=invalid')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid sort parameters')
      expect(data.details).toBeDefined()
    })

    it('should limit page size to maximum of 100', async () => {
      const mockTransactions = {
        transactions: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 }
      }

      vi.mocked(getTransactionsList).mockReturnValue(mockTransactions)

      const request = new Request('http://localhost:3000/api/transactions?pageSize=200')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(getTransactionsList).toHaveBeenCalledWith(
        {},
        { field: 'occurredAt', direction: 'desc' },
        1,
        100
      )
    })

    it('should handle database errors', async () => {
      vi.mocked(getTransactionsList).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new Request('http://localhost:3000/api/transactions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to fetch transactions')
      expect(data.details).toBe('Database connection failed')
    })
  })

  describe('POST /api/transactions', () => {
    const validTransactionData = {
      residentId: 'resident-1',
      contractId: 'contract-1',
      occurredAt: '2024-01-01T00:00:00.000Z',
      serviceCode: 'SERVICE001',
      description: 'Test service',
      quantity: 1,
      unitPrice: 100,
      amount: 100,
      note: 'Test note'
    }

    it('should create a regular transaction', async () => {
      const mockTransaction = {
        id: 'txn-123',
        ...validTransactionData,
        status: 'draft',
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'current-user',
        auditTrail: []
      }

      const mockBalancePreview = {
        contractId: 'contract-1',
        currentBalance: 1000,
        newBalance: 900,
        amount: 100
      }

      vi.mocked(generateTransactionId).mockReturnValue('txn-123')
      vi.mocked(getTransactionBalancePreview).mockReturnValue(mockBalancePreview)
      vi.mocked(getTransactionsFromStorage).mockReturnValue([])
      vi.mocked(saveTransactionsToStorage).mockImplementation(() => {})

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTransactionData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(expect.objectContaining({
        id: 'txn-123',
        residentId: 'resident-1',
        contractId: 'contract-1',
        amount: 100
      }))
      expect(data.balancePreview).toEqual(mockBalancePreview)
    })

    it('should create a drawdown transaction', async () => {
      const drawdownData = {
        ...validTransactionData,
        isDrawdownTransaction: true,
        serviceItemCode: 'ITEM001',
        supportAgreementId: 'agreement-1'
      }

      const mockTransaction = {
        id: 'txn-123',
        ...drawdownData,
        status: 'posted',
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'current-user',
        auditTrail: []
      }

      const mockBalancePreview = {
        contractId: 'contract-1',
        currentBalance: 1000,
        newBalance: 900,
        amount: 100
      }

      vi.mocked(processDrawdownTransaction).mockResolvedValue({
        success: true,
        transaction: mockTransaction,
        errors: []
      })
      vi.mocked(getTransactionBalancePreview).mockReturnValue(mockBalancePreview)

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drawdownData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTransaction)
      expect(data.balancePreview).toEqual(mockBalancePreview)
      expect(processDrawdownTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          residentId: 'resident-1',
          contractId: 'contract-1',
          serviceCode: 'SERVICE001',
          isDrawdownTransaction: true,
          serviceItemCode: 'ITEM001',
          supportAgreementId: 'agreement-1'
        }),
        'current-user'
      )
    })

    it('should handle drawdown transaction failure', async () => {
      const drawdownData = {
        ...validTransactionData,
        isDrawdownTransaction: true,
        serviceItemCode: 'ITEM001',
        supportAgreementId: 'agreement-1'
      }

      vi.mocked(processDrawdownTransaction).mockResolvedValue({
        success: false,
        transaction: null,
        errors: ['Invalid service item code']
      })

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drawdownData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Drawing Down transaction failed')
      expect(data.details).toEqual(['Invalid service item code'])
    })

    it('should handle validation errors for missing required fields', async () => {
      const invalidData = {
        residentId: '', // Invalid: empty string
        contractId: 'contract-1',
        quantity: -1, // Invalid: negative quantity
        unitPrice: -10 // Invalid: negative unit price
      }

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid transaction data')
      expect(data.details).toBeDefined()
    })

    it('should handle validation errors for invalid data types', async () => {
      const invalidData = {
        residentId: 'resident-1',
        contractId: 'contract-1',
        occurredAt: 'invalid-date', // Invalid date format
        serviceCode: 'SERVICE001',
        quantity: 'not-a-number', // Invalid: should be number
        unitPrice: 'not-a-number' // Invalid: should be number
      }

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid transaction data')
    })

    it('should calculate amount from quantity and unit price when not provided', async () => {
      const transactionData = {
        ...validTransactionData,
        quantity: 5,
        unitPrice: 20
        // amount not provided - should be calculated as 5 * 20 = 100
      }

      const mockTransaction = {
        id: 'txn-123',
        ...transactionData,
        amount: 100, // Calculated amount
        status: 'draft',
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'current-user',
        auditTrail: []
      }

      const mockBalancePreview = {
        contractId: 'contract-1',
        currentBalance: 1000,
        newBalance: 900,
        amount: 100
      }

      vi.mocked(generateTransactionId).mockReturnValue('txn-123')
      vi.mocked(getTransactionBalancePreview).mockReturnValue(mockBalancePreview)
      vi.mocked(getTransactionsFromStorage).mockReturnValue([])
      vi.mocked(saveTransactionsToStorage).mockImplementation(() => {})

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.amount).toBe(100)
    })

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to create transaction')
    })

    it('should handle database errors during creation', async () => {
      vi.mocked(generateTransactionId).mockReturnValue('txn-123')
      vi.mocked(getTransactionBalancePreview).mockReturnValue({
        contractId: 'contract-1',
        currentBalance: 1000,
        newBalance: 900,
        amount: 100
      })
      vi.mocked(getTransactionsFromStorage).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validTransactionData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to create transaction')
      expect(data.details).toBe('Database connection failed')
    })

    it('should handle large transaction amounts', async () => {
      const largeTransactionData = {
        ...validTransactionData,
        quantity: 1000,
        unitPrice: 500,
        amount: 500000
      }

      const mockTransaction = {
        id: 'txn-123',
        ...largeTransactionData,
        status: 'draft',
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'current-user',
        auditTrail: []
      }

      const mockBalancePreview = {
        contractId: 'contract-1',
        currentBalance: 1000000,
        newBalance: 500000,
        amount: 500000
      }

      vi.mocked(generateTransactionId).mockReturnValue('txn-123')
      vi.mocked(getTransactionBalancePreview).mockReturnValue(mockBalancePreview)
      vi.mocked(getTransactionsFromStorage).mockReturnValue([])
      vi.mocked(saveTransactionsToStorage).mockImplementation(() => {})

      const request = new Request('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largeTransactionData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.amount).toBe(500000)
    })
  })
})
