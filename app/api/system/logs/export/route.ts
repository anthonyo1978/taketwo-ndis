import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

type DateRange = 'today' | 'yesterday' | 'last-week' | 'last-2-weeks' | 'last-12-weeks' | 'all-time'

/**
 * GET /api/system/logs/export
 * Exports system logs as CSV for a given date range
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') as DateRange || 'today'

    // Calculate date range
    const now = new Date()
    let startDate: Date | null = null

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endOfYesterday.setMilliseconds(-1)
        break
      case 'last-week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last-2-weeks':
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        break
      case 'last-12-weeks':
        startDate = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000)
        break
      case 'all-time':
        startDate = null // No date filter
        break
    }

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('system_logs')
      .select(`
        id,
        created_at,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        user_agent,
        users!system_logs_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Add date filter if applicable
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch logs' },
        { status: 500 }
      )
    }

    // Convert to CSV
    const csvRows: string[] = []
    
    // Header row
    csvRows.push([
      'Timestamp',
      'User Name',
      'User Email',
      'Action',
      'Entity Type',
      'Entity ID',
      'Details',
      'IP Address',
      'User Agent'
    ].join(','))

    // Data rows
    for (const log of logs || []) {
      const user = (log as any).users
      const userName = user ? `${user.first_name} ${user.last_name}` : 'System'
      const userEmail = user?.email || 'N/A'
      const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : ''
      const userAgent = log.user_agent || ''

      csvRows.push([
        new Date(log.created_at).toISOString(),
        `"${userName}"`,
        `"${userEmail}"`,
        log.action,
        log.entity_type,
        log.entity_id || '',
        `"${details}"`,
        log.ip_address || '',
        `"${userAgent}"`
      ].join(','))
    }

    const csv = csvRows.join('\n')

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="system-logs-${range}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting logs:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

