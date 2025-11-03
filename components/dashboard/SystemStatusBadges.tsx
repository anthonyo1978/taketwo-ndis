"use client"

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface AutomationSettings {
  enabled: boolean
}

interface SystemStatusBadgesProps {
  className?: string
}

export function SystemStatusBadges({ className = '' }: SystemStatusBadgesProps) {
  const [automationEnabled, setAutomationEnabled] = useState<boolean | null>(null)
  const [ndiaNotificationsEnabled, setNdiaNotificationsEnabled] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSystemStatus()
  }, [])

  const fetchSystemStatus = async () => {
    try {
      setIsLoading(true)
      
      // Fetch automation settings
      const automationResponse = await fetch('/api/automation/settings')
      const automationResult = await automationResponse.json()
      
      if (automationResult.success && automationResult.data) {
        setAutomationEnabled(automationResult.data.enabled || false)
      }
      
      // TODO: Fetch NDIA notification settings when API is available
      // For now, set to false as placeholder
      setNdiaNotificationsEnabled(false)
      
    } catch (error) {
      console.error('Error fetching system status:', error)
      setAutomationEnabled(null)
      setNdiaNotificationsEnabled(null)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          <span className="text-sm text-gray-500">Loading status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Automation Status Badge */}
      <Link 
        href="/settings/automation"
        className="group"
      >
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all hover:shadow-md ${
          automationEnabled 
            ? 'bg-green-50 border-green-500 hover:bg-green-100' 
            : 'bg-orange-50 border-orange-500 hover:bg-orange-100'
        }`}>
          {automationEnabled ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-orange-600" />
          )}
          <div className="flex flex-col">
            <span className={`text-xs font-semibold ${
              automationEnabled ? 'text-green-700' : 'text-orange-700'
            }`}>
              Automated Billing
            </span>
            <span className={`text-xs ${
              automationEnabled ? 'text-green-600' : 'text-orange-600'
            }`}>
              {automationEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </Link>

      {/* NDIA Notifications Status Badge */}
      <Link 
        href="/settings/claiming"
        className="group"
      >
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all hover:shadow-md ${
          ndiaNotificationsEnabled 
            ? 'bg-green-50 border-green-500 hover:bg-green-100' 
            : 'bg-orange-50 border-orange-500 hover:bg-orange-100'
        }`}>
          {ndiaNotificationsEnabled ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-orange-600" />
          )}
          <div className="flex flex-col">
            <span className={`text-xs font-semibold ${
              ndiaNotificationsEnabled ? 'text-green-700' : 'text-orange-700'
            }`}>
              NDIA Notifications
            </span>
            <span className={`text-xs ${
              ndiaNotificationsEnabled ? 'text-green-600' : 'text-orange-600'
            }`}>
              {ndiaNotificationsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

