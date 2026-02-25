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
      const automationResult = await automationResponse.json() as {
        success: boolean
        data?: { enabled: boolean }
      }
      
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
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Automation Status Badge */}
      <Link 
        href="/automations"
        className="group"
      >
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
          automationEnabled 
            ? 'bg-white border-green-200 hover:border-green-300 hover:bg-green-50' 
            : 'bg-white border-orange-200 hover:border-orange-300 hover:bg-orange-50'
        }`}>
          {automationEnabled ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-orange-500" />
          )}
          <span className={`text-xs font-medium ${
            automationEnabled ? 'text-green-700' : 'text-orange-700'
          }`}>
            Auto Billing: {automationEnabled ? 'On' : 'Off'}
          </span>
        </div>
      </Link>

      {/* NDIA Notifications Status Badge */}
      <Link 
        href="/settings/claiming"
        className="group"
      >
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
          ndiaNotificationsEnabled 
            ? 'bg-white border-green-200 hover:border-green-300 hover:bg-green-50' 
            : 'bg-white border-orange-200 hover:border-orange-300 hover:bg-orange-50'
        }`}>
          {ndiaNotificationsEnabled ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-orange-500" />
          )}
          <span className={`text-xs font-medium ${
            ndiaNotificationsEnabled ? 'text-green-700' : 'text-orange-700'
          }`}>
            NDIA Notify: {ndiaNotificationsEnabled ? 'On' : 'Off'}
          </span>
        </div>
      </Link>
    </div>
  )
}

