import { houseService } from '../../../lib/supabase/services/houses'

export async function GET() {
  try {
    console.log('🧪 Testing houses service...')
    
    // Test getting all houses
    const houses = await houseService.getAll()
    
    return Response.json({
      success: true,
      message: 'Houses service working!',
      data: {
        housesCount: houses.length,
        houses: houses
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Houses service test failed:', error)
    
    return Response.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
