import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

/**
 * GET /api/contacts/search?q=xxx
 * Search for existing contacts by name, email, or phone
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const supabase = await createClient()

    // Search contacts by name, email, or phone
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, role, phone, email, description')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('Error searching contacts:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to search contacts' },
        { status: 500 }
      )
    }

    // Get resident count for each contact
    const contactsWithCounts = await Promise.all(
      (data || []).map(async (contact) => {
        const { data: countData } = await supabase
          .rpc('get_contact_resident_count', { contact_uuid: contact.id })
        
        return {
          ...contact,
          residentCount: countData || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: contactsWithCounts
    })

  } catch (error) {
    console.error('Error searching contacts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

