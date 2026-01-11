import { NextRequest, NextResponse } from "next/server"
import { utilitySnapshotService } from "lib/supabase/services/utility-snapshots"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// DELETE /api/utility-snapshots/[id]
// Delete a utility snapshot
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    await utilitySnapshotService.delete(id)
    
    return NextResponse.json(
      { 
        success: true,
        message: "Utility snapshot deleted successfully"
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete utility snapshot error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to delete utility snapshot" 
      },
      { status: 500 }
    )
  }
}

