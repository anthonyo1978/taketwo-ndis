/**
 * Health check endpoint for monitoring system status.
 * 
 * @returns JSON response with system status
 */
export async function GET() {
  return Response.json({ status: "ok" })
}
