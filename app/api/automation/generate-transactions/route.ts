import { NextRequest, NextResponse } from "next/server"
import { generateTransactionsForEligibleContracts, previewTransactionGeneration } from "lib/services/transaction-generator"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    
    if (action === 'preview') {
      // Preview transactions without creating them
      const result = await previewTransactionGeneration()
      
      return NextResponse.json({
        success: result.success,
        data: {
          eligibleContracts: result.eligibleContracts,
          previewTransactions: result.previewTransactions,
          totalAmount: result.totalAmount
        },
        error: result.error
      })
    }
    
    if (action === 'generate') {
      // Actually generate transactions
      const result = await generateTransactionsForEligibleContracts()
      
      return NextResponse.json({
        success: result.success,
        data: {
          processedContracts: result.processedContracts,
          successfulTransactions: result.successfulTransactions,
          failedTransactions: result.failedTransactions,
          transactions: result.transactions,
          errors: result.errors,
          summary: result.summary
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "preview" or "generate"'
    }, { status: 400 })
    
  } catch (error: any) {
    console.error('Error in generate-transactions API:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate transactions'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Default to preview mode for GET requests
    const result = await previewTransactionGeneration()
    
    return NextResponse.json({
      success: result.success,
      data: {
        eligibleContracts: result.eligibleContracts,
        previewTransactions: result.previewTransactions,
        totalAmount: result.totalAmount
      },
      error: result.error
    })
    
  } catch (error: any) {
    console.error('Error in generate-transactions GET API:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to preview transactions'
    }, { status: 500 })
  }
}
