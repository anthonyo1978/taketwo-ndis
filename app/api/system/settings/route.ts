import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserId, logAction, getRequestMetadata } from 'lib/services/audit-logger'

/**
 * GET /api/system/settings
 * Get all system settings
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Convert to key-value object
    const settingsObj: Record<string, any> = {}
    for (const setting of settings || []) {
      settingsObj[setting.setting_key] = setting.setting_value
    }

    return NextResponse.json({
      success: true,
      data: settingsObj
    })

  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/system/settings
 * Update a system setting
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { 
      key: string
      value: any
    }

    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Setting key is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userId = await getCurrentUserId()

    // Check if setting exists
    const { data: existingSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single()

    let error
    if (existingSetting) {
      // Update existing setting
      const result = await supabase
        .from('system_settings')
        .update({
          setting_value: value,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key)
      error = result.error
    } else {
      // Insert new setting
      const result = await supabase
        .from('system_settings')
        .insert({
          setting_key: key,
          setting_value: value,
          updated_by: userId
        })
      error = result.error
    }

    if (error) {
      console.error('Error updating setting:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update setting' },
        { status: 500 }
      )
    }

    // Log the setting change (only if logging is enabled or if this is the logging toggle itself)
    if (userId && (key === 'logging_enabled' || existingSetting?.setting_value === true)) {
      const metadata = getRequestMetadata(request)
      await logAction({
        userId,
        entityType: 'setting',
        action: 'update',
        details: {
          setting_key: key,
          old_value: existingSetting?.setting_value,
          new_value: value
        },
        ...metadata
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully'
    })

  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

