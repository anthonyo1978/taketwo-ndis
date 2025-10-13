import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'
import { getCurrentUserId, logAction, getRequestMetadata } from 'lib/services/audit-logger'
import { z } from 'zod'

const contactUpdateSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  description: z.string().optional(),
  note: z.string().optional()
})

/**
 * PUT /api/contacts/[id]
 * Update a contact (affects all residents linked to this contact)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params
    const body = await request.json()

    const validation = contactUpdateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid contact data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userId = await getCurrentUserId()
    const metadata = getRequestMetadata(request)

    // Get old contact data for logging
    const { data: oldContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    // Update contact
    const { data: updatedContact, error } = await supabase
      .from('contacts')
      .update({
        name: validation.data.name,
        role: validation.data.role || null,
        phone: validation.data.phone || null,
        email: validation.data.email || null,
        description: validation.data.description || null,
        note: validation.data.note || null
      })
      .eq('id', contactId)
      .select()
      .single()

    if (error) {
      console.error('Error updating contact:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update contact' },
        { status: 500 }
      )
    }

    // Log the action
    if (userId) {
      await logAction({
        userId,
        entityType: 'contact' as any,
        entityId: contactId,
        action: 'update',
        details: {
          before: oldContact,
          after: validation.data
        },
        ...metadata
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedContact
    })

  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

