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
    console.log('[ORG SETTINGS] Fetching organization settings')
    
    const orgService = new OrganizationService()
    const settings = await orgService.getSettings()

    if (!settings) {
      console.log('[ORG SETTINGS] No settings found')
      return NextResponse.json({
        success: false,
        error: 'Organization settings not found'
      }, { status: 404 })
    }

    console.log('[ORG SETTINGS] Settings retrieved successfully')
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
    console.log('[ORG SETTINGS] Updating organization settings')
    
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
      console.log('[ORG SETTINGS] Failed to update settings')
      return NextResponse.json({
        success: false,
        error: 'Failed to update organization settings'
      }, { status: 500 })
    }

    console.log('[ORG SETTINGS] Settings updated successfully')
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

