import { NextResponse } from 'next/server'

// This constant is set at BUILD TIME — it will change with every new deployment
const BUILD_TIMESTAMP = '2026-02-25T08:00:00Z'
const BUILD_MARKER = 'cf53960-v2'

export async function GET() {
  return NextResponse.json({
    buildMarker: BUILD_MARKER,
    buildTimestamp: BUILD_TIMESTAMP,
    commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'unknown',
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
    env: process.env.VERCEL_ENV || 'unknown',
  })
}

