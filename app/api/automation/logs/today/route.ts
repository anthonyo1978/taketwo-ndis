import { NextResponse } from "next/server"
import { createClient } from "lib/supabase/server"

/**
 * Check if automation has already run today
 * GET /api/automation/logs/today
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    // Check if there's a log entry for today
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .gte('run_date', `${today}T00:00:00Z`)
      .lt('run_date', `${today}T23:59:59Z`)
      .order('run_date', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error checking automation logs:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to check automation logs'
      }, { status: 500 })
    }
    
    const alreadyRan = data && data.length > 0
    
    return NextResponse.json({
      success: true,
      alreadyRan,
      lastRun: alreadyRan ? data[0] : null,
      today
    })
    
  } catch (error) {
    console.error('Error in logs/today endpoint:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

