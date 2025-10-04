import { NextRequest, NextResponse } from "next/server"
import { getEligibleContracts, checkContractEligibility } from "lib/services/contract-eligibility"

/**
 * GET /api/automation/eligible-contracts
 * Get all contracts eligible for automation today
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contractId = searchParams.get('contractId')

    // If specific contract ID provided, check that contract
    if (contractId) {
      const result = await checkContractEligibility(contractId)
      return NextResponse.json({
        success: true,
        data: result
      })
    }

    // Otherwise, get all eligible contracts
    const eligibleContracts = await getEligibleContracts()
    
    return NextResponse.json({
      success: true,
      data: {
        eligibleContracts,
        count: eligibleContracts.length,
        summary: {
          total: eligibleContracts.length,
          eligible: eligibleContracts.filter(c => c.isEligible).length,
          ineligible: eligibleContracts.filter(c => !c.isEligible).length
        }
      }
    })
  } catch (error) {
    console.error('Error fetching eligible contracts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch eligible contracts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/automation/eligible-contracts
 * Test eligibility for specific contracts (for debugging)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      contractIds?: string[]
    }
    const { contractIds } = body

    if (!contractIds || !Array.isArray(contractIds)) {
      return NextResponse.json({
        success: false,
        error: 'contractIds array is required'
      }, { status: 400 })
    }

    const results = []
    for (const contractId of contractIds) {
      const result = await checkContractEligibility(contractId)
      results.push(result)
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          eligible: results.filter(r => r.isEligible).length,
          ineligible: results.filter(r => !r.isEligible).length
        }
      }
    })
  } catch (error) {
    console.error('Error testing contract eligibility:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test contract eligibility',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
