"use client"

import { useState, useEffect } from 'react'
import { Button } from 'components/Button/Button'
import toast from 'react-hot-toast'

interface DashboardWidget {
  id: string
  name: string
  description: string
  enabled: boolean
}

export default function DashboardSettingsPage() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'total-houses',
      name: 'Total Houses',
      description: 'Display the total number of houses in the system',
      enabled: true
    },
    {
      id: 'total-residents',
      name: 'Total Residents',
      description: 'Display the total number of residents',
      enabled: true
    },
    {
      id: 'active-contracts',
      name: 'Active Contracts',
      description: 'Show the number of active funding contracts',
      enabled: true
    },
    {
      id: 'available-funding',
      name: 'Available Funding',
      description: 'Display total available funding amount',
      enabled: true
    },
    {
      id: 'claims-paid',
      name: 'Claims Paid',
      description: 'Show total amount of paid claims',
      enabled: true
    },
    {
      id: 'last-7-days-transactions',
      name: 'Last 7 Days Transactions',
      description: 'Display transaction volume for the past 7 days',
      enabled: true
    },
    {
      id: 'last-30-days-transactions',
      name: 'Last 30 Days Transactions',
      description: 'Display transaction volume for the past 30 days',
      enabled: true
    },
    {
      id: 'last-12-months-transactions',
      name: 'Last 12 Months Transactions',
      description: 'Display transaction volume for the past 12 months',
      enabled: true
    },
    {
      id: 'transaction-trends',
      name: 'Transaction Trends',
      description: 'Show transaction trends over time',
      enabled: true
    },
    {
      id: 'recent-activity',
      name: 'Recent Activity',
      description: 'Display recent system activity',
      enabled: true
    },
    {
      id: 'house-performance',
      name: 'House Performance',
      description: 'Show performance metrics for houses',
      enabled: true
    }
  ])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      // For now, we'll use the default settings
      // In the future, this would load from an API
      setTimeout(() => {
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error('Error loading dashboard settings:', error)
      setIsLoading(false)
    }
  }

  const handleToggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, enabled: !widget.enabled }
        : widget
    ))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    
    try {
      // For now, just simulate saving
      // In the future, this would save to an API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Dashboard settings saved successfully!')
    } catch (error) {
      console.error('Error saving dashboard settings:', error)
      toast.error('Failed to save dashboard settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefaults = () => {
    setWidgets(prev => prev.map(widget => ({ ...widget, enabled: true })))
    toast.success('Settings reset to defaults')
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back to Settings</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <svg className="size-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Settings</h1>
            </div>
          </div>
          <p className="text-gray-600">Configure the settings, the viewable settings of your dashboard.</p>
        </div>

        {/* Widget Settings */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Dashboard Widgets</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enable or disable widgets to customize your dashboard view
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    widget.enabled 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 rounded-full ${
                      widget.enabled 
                        ? 'bg-green-500' 
                        : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{widget.name}</p>
                      <p className="text-xs text-gray-600">{widget.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      widget.enabled ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      {widget.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => handleToggleWidget(widget.id)}
                      className="relative inline-flex items-center cursor-pointer"
                    >
                      <input 
                        type="checkbox" 
                        checked={widget.enabled}
                        onChange={() => {}}
                        className="sr-only peer" 
                      />
                      <div className={`w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        widget.enabled
                          ? 'bg-green-600 peer-checked:after:translate-x-full'
                          : 'bg-gray-200'
                      }`}></div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            onClick={handleResetToDefaults}
            disabled={isSaving}
            intent="secondary"
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            intent="primary"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Dashboard Customization</p>
              <p>Changes to widget visibility will take effect immediately when you save. You can always return to this page to modify your dashboard layout.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
