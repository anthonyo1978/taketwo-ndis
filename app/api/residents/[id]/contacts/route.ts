import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserId, logAction, getRequestMetadata } from 'lib/services/audit-logger'
import { getCurrentUserOrganizationId } from 'lib/utils/organization'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  description: z.string().optional(),
  note: z.string().optional()
})

/**
 * GET /api/residents/[id]/contacts
 * Get all contacts for a specific resident
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: residentId } = await params
    const supabase = await createClient()

    // Get all contacts for this resident via join table
    const { data, error } = await supabase
      .from('resident_contacts')
      .select(`
        id,
        created_at,
        contact:contacts (
          id,
          name,
          role,
          phone,
          email,
          description,
          note,
          created_at,
          updated_at
        )
      `)
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch contacts' },
        { status: 500 }
      )
    }

    // Get resident count for each contact (to show if shared)
    const contactsWithCounts = await Promise.all(
      (data || []).map(async (rc: any) => {
        const { data: countData } = await supabase
          .rpc('get_contact_resident_count', { contact_uuid: rc.contact.id })
        
        return {
          linkId: rc.id,
          ...rc.contact,
          residentCount: countData || 1
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: contactsWithCounts
    })

  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/residents/[id]/contacts
 * Add a new contact or link existing contact to resident
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: residentId } = await params
    const body = await request.json() as { 
      contactId?: string  // If linking existing contact
      name?: string       // If creating new contact
      role?: string
      phone?: string
      email?: string
      description?: string
      note?: string
    }

    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const metadata = getRequestMetadata(request)

    // Get organization context
    const organizationId = await getCurrentUserOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 401 }
      )
    }

    let contactId = body.contactId

    // If no contactId provided, create new contact
    if (!contactId) {
      const validation = contactSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid contact data', details: validation.error.issues },
          { status: 400 }
        )
      }

      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          name: validation.data.name,
          role: validation.data.role || null,
          phone: validation.data.phone || null,
          email: validation.data.email || null,
          description: validation.data.description || null,
          note: validation.data.note || null,
          organization_id: organizationId
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating contact:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create contact' },
          { status: 500 }
        )
      }

      contactId = newContact.id

      // Log contact creation
      if (userId) {
        await logAction({
          userId,
          entityType: 'contact' as any,
          entityId: contactId,
          action: 'create',
          details: { name: validation.data.name, role: validation.data.role },
          ...metadata
        })
      }
    }

    // Link contact to resident
    const { error: linkError } = await supabase
      .from('resident_contacts')
      .insert({
        resident_id: residentId,
        contact_id: contactId,
        organization_id: organizationId
      })

    if (linkError) {
      console.error('Error linking contact:', linkError)
      return NextResponse.json(
        { success: false, error: 'Failed to link contact to resident' },
        { status: 500 }
      )
    }

    // Log the link action
    if (userId) {
      await logAction({
        userId,
        entityType: 'resident',
        entityId: residentId,
        action: 'update',
        details: { action: 'add_contact', contactId },
        ...metadata
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Contact added successfully'
    })

  } catch (error) {
    console.error('Error adding contact:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/residents/[id]/contacts?linkId=xxx
 * Remove contact link from resident
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: residentId } = await params
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')

    if (!linkId) {
      return NextResponse.json(
        { success: false, error: 'Link ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const metadata = getRequestMetadata(request)

    // Get the link info before deleting
    const { data: link } = await supabase
      .from('resident_contacts')
      .select('contact_id, contact:contacts(id, name, role)')
      .eq('id', linkId)
      .single()

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Contact link not found' },
        { status: 404 }
      )
    }

    // Check if this is the only resident linked to this contact
    const { data: countData } = await supabase
      .rpc('get_contact_resident_count', { contact_uuid: link.contact_id })

    const residentCount = countData || 0

    // Delete the link
    const { error: deleteError } = await supabase
      .from('resident_contacts')
      .delete()
      .eq('id', linkId)

    if (deleteError) {
      console.error('Error deleting contact link:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove contact' },
        { status: 500 }
      )
    }

    // If this was the only link, delete the contact itself
    if (residentCount === 1) {
      await supabase
        .from('contacts')
        .delete()
        .eq('id', link.contact_id)
    }

    // Log the action
    if (userId) {
      await logAction({
        userId,
        entityType: 'resident',
        entityId: residentId,
        action: 'update',
        details: { 
          action: 'remove_contact', 
          contactId: link.contact_id,
          contactName: (link.contact as any)?.name,
          deletedContact: residentCount === 1
        },
        ...metadata
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Contact removed successfully',
      deletedContact: residentCount === 1
    })

  } catch (error) {
    console.error('Error removing contact:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

