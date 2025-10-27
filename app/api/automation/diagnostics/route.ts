import { NextResponse } from 'next/server'
import { runAutomationDiagnostics } from 'lib/diagnostics/automation-diagnostics'

export async function GET() {
  try {
    const diagnostics = await runAutomationDiagnostics()
    
    return NextResponse.json({
      success: true,
      data: diagnostics
    })
  } catch (error) {
    console.error('[AUTOMATION DIAGNOSTICS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

