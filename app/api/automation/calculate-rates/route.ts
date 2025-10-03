import { NextRequest, NextResponse } from "next/server"
import { calculateContractRates, enableContractAutomation } from "lib/services/contract-rate-calculator"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      contractId?: string
      amount?: number
      startDate?: string
      endDate?: string
      frequency?: string
      action?: string
    }
    
    const { contractId, amount, startDate, endDate, frequency, action } = body
    
    if (action === 'calculate') {
      // Just calculate rates without updating database
      if (!amount || !startDate || !endDate || !frequency) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: amount, startDate, endDate, frequency'
        }, { status: 400 })
      }
      
      const calculation = calculateContractRates(amount, startDate, endDate, frequency)
      
      return NextResponse.json({
        success: true,
        data: {
          calculation,
          transactionAmount: calculation.isValid ? 
            getTransactionAmount(frequency, calculation.dailyRate) : 0
        }
      })
    }
    
    if (action === 'enable') {
      // Enable automation and update contract
      if (!contractId || !frequency) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: contractId, frequency'
        }, { status: 400 })
      }
      
      const result = await enableContractAutomation(contractId, frequency)
      
      return NextResponse.json({
        success: result.success,
        data: result.calculation,
        error: result.error
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "calculate" or "enable"'
    }, { status: 400 })
    
  } catch (error: any) {
    console.error('Error in calculate-rates API:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to calculate rates'
    }, { status: 500 })
  }
}

function getTransactionAmount(frequency: string, dailyRate: number): number {
  switch (frequency) {
    case 'daily':
      return dailyRate
    case 'weekly':
      return dailyRate * 7
    case 'fortnightly':
      return dailyRate * 14
    default:
      return dailyRate
  }
}
