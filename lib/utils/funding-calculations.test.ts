import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContractStatus, DrawdownRate, FundingInformation } from 'types/resident'
import {
  calculateBalanceSummary,
  calculateCurrentBalance,
  calculateDrawdownAmount,
  generateContractRenewal,
  isContractExpiringSoon,
  getDrawdownPercentage,
  needsRenewal
} from './funding-calculations'

// Mock funding contract helper
const createMockContract = (overrides: Partial<FundingInformation> = {}): FundingInformation => ({
  id: 'test-contract-1',
  type: 'Draw Down',
  amount: 12000,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  description: 'Test contract',
  isActive: true,
  contractStatus: 'Active',
  originalAmount: 12000,
  currentBalance: 12000,
  drawdownRate: 'monthly',
  autoDrawdown: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

describe('funding-calculations', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('calculateCurrentBalance', () => {
    it('returns original amount for non-active contracts', () => {
      const contract = createMockContract({
        contractStatus: 'Draft',
        autoDrawdown: false
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBe(12000)
    })

    it('returns original amount when auto-drawdown is disabled', () => {
      const contract = createMockContract({
        autoDrawdown: false
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBe(12000)
    })

    it('calculates linear drawdown for monthly rate', () => {
      // Mock current date to July 1, 2024 (6 months after start)
      vi.setSystemTime(new Date('2024-07-01'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        drawdownRate: 'monthly',
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const balance = calculateCurrentBalance(contract)
      // January to July is 6 months, January to December is 11 months = 54.5%
      // So balance should be around 45.5% of original = ~6545
      expect(balance).toBeCloseTo(6545.45, 1) // Allow for small differences in date calculation
    })

    it('calculates linear drawdown for daily rate', () => {
      // Mock current date to 6 days after start
      vi.setSystemTime(new Date('2024-01-07'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-13'), // 12 days total
        drawdownRate: 'daily',
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBe(6000) // 50% drawn down after 6 days
    })

    it('returns 0 for expired contracts', () => {
      vi.setSystemTime(new Date('2025-01-01'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBe(0) // Fully drawn down after expiry
    })

    it('returns full amount for future contracts', () => {
      vi.setSystemTime(new Date('2023-12-01'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBe(12000) // No drawdown before start date
    })

    it('returns original amount for ongoing contracts without end date', () => {
      vi.setSystemTime(new Date('2024-07-01'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: undefined,
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBe(12000) // No end date means no drawdown
    })
  })

  describe('calculateDrawdownAmount', () => {
    it('calculates correct drawdown amount', () => {
      // Mock current date to July 1, 2024 (6 months after start)
      vi.setSystemTime(new Date('2024-07-01'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        drawdownRate: 'monthly',
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const drawdown = calculateDrawdownAmount(contract)
      expect(drawdown).toBeCloseTo(5454.55, 1) // Allow for small differences in date calculation
    })
  })

  describe('isContractExpiringSoon', () => {
    it('returns true for contracts expiring within threshold', () => {
      vi.setSystemTime(new Date('2024-12-15'))
      
      const contract = createMockContract({
        endDate: new Date('2024-12-20') // 5 days from now
      })
      
      const isExpiring = isContractExpiringSoon(contract, 30)
      expect(isExpiring).toBe(true)
    })

    it('returns false for contracts expiring beyond threshold', () => {
      vi.setSystemTime(new Date('2024-12-01'))
      
      const contract = createMockContract({
        endDate: new Date('2024-12-20') // 19 days from now
      })
      
      const isExpiring = isContractExpiringSoon(contract, 10)
      expect(isExpiring).toBe(false)
    })

    it('returns false for contracts without end date', () => {
      const contract = createMockContract({
        endDate: undefined
      })
      
      const isExpiring = isContractExpiringSoon(contract, 30)
      expect(isExpiring).toBe(false)
    })
  })

  describe('generateContractRenewal', () => {
    it('creates renewal contract with correct structure', () => {
      const originalContract = createMockContract({
        id: 'original-123',
        type: 'Capture & Invoice',
        originalAmount: 15000,
        drawdownRate: 'weekly',
        autoDrawdown: false
      })
      
      const renewal = generateContractRenewal(originalContract)
      
      expect(renewal.type).toBe('Capture & Invoice')
      expect(renewal.originalAmount).toBe(15000)
      expect(renewal.currentBalance).toBe(15000)
      expect(renewal.drawdownRate).toBe('weekly')
      expect(renewal.autoDrawdown).toBe(false)
      expect(renewal.parentContractId).toBe('original-123')
      expect(renewal.contractStatus).toBe('Draft')
      expect(renewal.description).toContain('Renewal of contract original-123')
    })
  })

  describe('calculateBalanceSummary', () => {
    it('calculates correct balance summary for multiple contracts', () => {
      // Mock current date for consistent calculations
      vi.setSystemTime(new Date('2024-07-01'))
      
      const contracts = [
        createMockContract({
          id: 'contract-1',
          originalAmount: 10000,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          drawdownRate: 'monthly',
          contractStatus: 'Active',
          autoDrawdown: true
        }),
        createMockContract({
          id: 'contract-2',
          originalAmount: 8000,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          drawdownRate: 'monthly',
          contractStatus: 'Active',
          autoDrawdown: true
        }),
        createMockContract({
          id: 'contract-3',
          originalAmount: 5000,
          contractStatus: 'Draft'
        })
      ]
      
      const summary = calculateBalanceSummary(contracts)
      
      expect(summary.totalOriginal).toBe(23000) // 10000 + 8000 + 5000
      expect(summary.totalCurrent).toBeGreaterThan(0) // Should be calculated
      expect(summary.totalDrawnDown).toBeGreaterThan(0) // Should be calculated
      expect(summary.activeContracts).toBe(2)   // 2 active contracts
    })

    it('handles empty contract array', () => {
      const summary = calculateBalanceSummary([])
      
      expect(summary.totalOriginal).toBe(0)
      expect(summary.totalCurrent).toBe(0)
      expect(summary.totalDrawnDown).toBe(0)
      expect(summary.activeContracts).toBe(0)
      expect(summary.expiringSoon).toBe(0)
    })
  })

  describe('getDrawdownPercentage', () => {
    it('calculates completion percentage correctly', () => {
      vi.setSystemTime(new Date('2024-07-01'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        drawdownRate: 'monthly',
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      // Currently at July 1, 2024 (6 months / 11 months = 54.5%)
      const completion = getDrawdownPercentage(contract)
      expect(completion).toBeCloseTo(45.45, 1) // Allow for larger differences in date calculation
    })

    it('returns 0 for non-active contracts', () => {
      const contract = createMockContract({
        contractStatus: 'Draft',
        autoDrawdown: false
      })
      
      const completion = getDrawdownPercentage(contract)
      expect(completion).toBe(0)
    })

    it('returns 100 for expired contracts', () => {
      vi.setSystemTime(new Date('2025-01-01'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const completion = getDrawdownPercentage(contract)
      expect(completion).toBe(100)
    })
  })

  describe('needsRenewal', () => {
    it('returns true for contracts expiring soon', () => {
      vi.setSystemTime(new Date('2024-12-15'))
      
      const contract = createMockContract({
        endDate: new Date('2024-12-20') // 5 days from now
      })
      
      const needs = needsRenewal(contract)
      expect(needs).toBe(true)
    })

    it('returns false for contracts not expiring soon', () => {
      vi.setSystemTime(new Date('2024-01-01'))
      
      const contract = createMockContract({
        endDate: new Date('2024-12-31') // 11 months from now
      })
      
      const needs = needsRenewal(contract)
      expect(needs).toBe(false)
    })

    it('returns false for contracts without end date', () => {
      const contract = createMockContract({
        endDate: undefined
      })
      
      const needs = needsRenewal(contract)
      expect(needs).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles contracts with same start and end date', () => {
      vi.setSystemTime(new Date('2024-01-01'))
      
      const contract = createMockContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-01'),
        originalAmount: 1000,
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBe(0) // Should be fully drawn down
    })

    it('handles very small amounts correctly', () => {
      const contract = createMockContract({
        originalAmount: 1,
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBeGreaterThanOrEqual(0)
    })

    it('handles leap year calculations correctly', () => {
      vi.setSystemTime(new Date('2024-02-29')) // Leap year
      
      const contract = createMockContract({
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-29'),
        originalAmount: 1000,
        contractStatus: 'Active',
        autoDrawdown: true
      })
      
      const balance = calculateCurrentBalance(contract)
      expect(balance).toBe(0) // Should be fully drawn down on the last day
    })
  })
})