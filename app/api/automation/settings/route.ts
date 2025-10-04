import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "lib/supabase/server"

// Automation settings schema for API validation
const automationSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  runTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Run time must be in HH:MM or HH:MM:SS format")
    .default("02:00"),
  timezone: z.string()
    .min(1, "Timezone is required")
    .default("Australia/Sydney"),
  adminEmails: z.array(z.string().email("Invalid email address"))
    .min(1, "At least one admin email is required")
    .default([]),
  notificationSettings: z.object({
    frequency: z.enum(["endOfRun", "endOfWeek", "off"])
      .default("endOfRun"),
    includeLogs: z.boolean().default(true)
  }).default({
    frequency: "endOfRun",
    includeLogs: true
  }),
  errorHandling: z.object({
    continueOnError: z.boolean().default(true)
  }).default({
    continueOnError: true
  })
})

// For now, we'll use a single organization ID
// In a multi-tenant system, this would come from authentication
const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000000"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('organization_id', DEFAULT_ORGANIZATION_ID)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching automation settings:', error)
      
      // If table doesn't exist, return default settings
      if (error.code === 'PGRST205') {
        const defaultSettings = {
          id: null,
          organizationId: DEFAULT_ORGANIZATION_ID,
          enabled: false,
          runTime: "02:00",
          timezone: "Australia/Sydney",
          adminEmails: [],
          notificationSettings: {
            frequency: "endOfRun",
            includeLogs: true
          },
          errorHandling: {
            continueOnError: true
          },
          createdAt: null,
          updatedAt: null
        }

        return NextResponse.json({
          success: true,
          data: defaultSettings,
          message: 'Using default settings (automation_settings table not found)'
        })
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch automation settings' 
        }, 
        { status: 500 }
      )
    }

    // If no settings exist, return default values
    if (!data) {
      const defaultSettings = {
        id: null,
        organizationId: DEFAULT_ORGANIZATION_ID,
        enabled: false,
        runTime: "02:00",
        timezone: "Australia/Sydney",
        adminEmails: [],
        notificationSettings: {
          frequency: "endOfRun",
          includeLogs: true
        },
        errorHandling: {
          continueOnError: true
        },
        createdAt: null,
        updatedAt: null
      }

      return NextResponse.json({
        success: true,
        data: defaultSettings
      })
    }

    // Transform database data to match frontend format
    const settings = {
      id: data.id,
      organizationId: data.organization_id,
      enabled: data.enabled,
      runTime: data.run_time,
      timezone: data.timezone,
      adminEmails: data.admin_emails || [],
      notificationSettings: data.notification_settings || {
        frequency: "endOfRun",
        includeLogs: true
      },
      errorHandling: data.error_handling || {
        continueOnError: true
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('Error in GET /api/automation/settings:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json() as {
      enabled?: boolean
      runTime?: string
      timezone?: string
      adminEmails?: string[]
      notificationSettings?: {
        frequency?: string
        includeLogs?: boolean
      }
      errorHandling?: {
        continueOnError?: boolean
      }
    }
    
    // Validate the request body
    const validation = automationSettingsSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid automation settings',
          details: validation.error.issues
        }, 
        { status: 400 }
      )
    }

    const settingsData = validation.data

    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('automation_settings')
      .select('id')
      .eq('organization_id', DEFAULT_ORGANIZATION_ID)
      .single()

    let result
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from('automation_settings')
        .update({
          enabled: settingsData.enabled,
          run_time: settingsData.runTime,
          timezone: settingsData.timezone,
          admin_emails: settingsData.adminEmails,
          notification_settings: settingsData.notificationSettings,
          error_handling: settingsData.errorHandling,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', DEFAULT_ORGANIZATION_ID)
        .select()
        .single()

      if (error) {
        console.error('Error updating automation settings:', error)
        
        // If table doesn't exist, return helpful error message
        if (error.code === 'PGRST205') {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Automation settings table not found. Please create the automation_settings table in the database first.',
              details: 'The automation_settings table needs to be created before settings can be saved.'
            }, 
            { status: 500 }
          )
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to update automation settings' 
          }, 
          { status: 500 }
        )
      }

      result = data
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('automation_settings')
        .insert({
          organization_id: DEFAULT_ORGANIZATION_ID,
          enabled: settingsData.enabled,
          run_time: settingsData.runTime,
          timezone: settingsData.timezone,
          admin_emails: settingsData.adminEmails,
          notification_settings: settingsData.notificationSettings,
          error_handling: settingsData.errorHandling
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating automation settings:', error)
        
        // If table doesn't exist, return helpful error message
        if (error.code === 'PGRST205') {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Automation settings table not found. Please create the automation_settings table in the database first.',
              details: 'The automation_settings table needs to be created before settings can be saved.'
            }, 
            { status: 500 }
          )
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create automation settings' 
          }, 
          { status: 500 }
        )
      }

      result = data
    }

    // Transform response to match frontend format
    const responseSettings = {
      id: result.id,
      organizationId: result.organization_id,
      enabled: result.enabled,
      runTime: result.run_time,
      timezone: result.timezone,
      adminEmails: result.admin_emails || [],
      notificationSettings: result.notification_settings || {
        frequency: "endOfRun",
        includeLogs: true
      },
      errorHandling: result.error_handling || {
        continueOnError: true
      },
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }

    return NextResponse.json({
      success: true,
      data: responseSettings,
      message: existingSettings ? 'Automation settings updated successfully' : 'Automation settings created successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/automation/settings:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}
