import { NextRequest, NextResponse } from "next/server"
import { createClient } from "lib/supabase/server"

/**
 * Emergency endpoint to delete today's automation log
 * This allows automation to run again on the same day for testing
 * 
 * DELETE /api/automation/delete-todays-log
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get today's date in YYYY-MM-DD format (Australia/Sydney timezone)
    const now = new Date()
    const todayStr = now.toLocaleDateString('en-CA', { 
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    // Find logs from today first
    const { data: logs, error: fetchError } = await supabase
      .from('automation_logs')
      .select('*')
      .gte('run_date', `${todayStr}T00:00:00Z`)
      .lt('run_date', `${todayStr}T23:59:59Z`)
    
    if (fetchError) {
      console.error('Error fetching automation logs:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch automation logs',
        details: fetchError
      }, { status: 500 })
    }
    
    const logCount = logs?.length || 0
    
    // Now delete them
    const { error: deleteError } = await supabase
      .from('automation_logs')
      .delete()
      .gte('run_date', `${todayStr}T00:00:00Z`)
      .lt('run_date', `${todayStr}T23:59:59Z`)
    
    if (deleteError) {
      console.error('Error deleting automation logs:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete automation logs',
        details: deleteError
      }, { status: 500 })
    }
    
    console.log(`[AUTOMATION CLEANUP] Deleted ${logCount} log entries for ${todayStr}`)
    
    return NextResponse.json({
      success: true,
      deleted: logCount,
      date: todayStr
    })
    
  } catch (error) {
    console.error('Error in delete-todays-log endpoint:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

