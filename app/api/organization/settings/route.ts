import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { OrganizationService } from 'lib/supabase/services/organization'
import { OrganizationSettingsUpdateInput } from 'types/organization'

/**
 * GET /api/organization/settings
 * Get organization settings for the current user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const orgService = new OrganizationService()
    const settings = await orgService.getSettings()

    if (!settings) {
      return NextResponse.json({
        success: false,
        error: 'Organization settings not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('[ORG SETTINGS] Error fetching settings:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch organization settings'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/organization/settings
 * Update organization settings for the current user's organization
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as OrganizationSettingsUpdateInput
    
    // Validate required fields
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No update data provided'
      }, { status: 400 })
    }

    const orgService = new OrganizationService()
    const updatedSettings = await orgService.updateSettings(body)

    if (!updatedSettings) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update organization settings'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedSettings
    })

  } catch (error) {
    console.error('[ORG SETTINGS] Error updating settings:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update organization settings'
    }, { status: 500 })
  }
}
