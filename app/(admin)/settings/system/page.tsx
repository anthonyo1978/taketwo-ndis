"use client"

import { useState } from 'react'
import { Button } from 'components/Button/Button'
import toast from 'react-hot-toast'

type DateRange = 'today' | 'yesterday' | 'last-week' | 'last-2-weeks' | 'last-12-weeks' | 'all-time'

export default function SystemSettingsPage() {
  const [selectedRange, setSelectedRange] = useState<DateRange>('today')
  const [isGenerating, setIsGenerating] = useState(false)

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'last-2-weeks', label: 'Last 2 Weeks' },
    { value: 'last-12-weeks', label: 'Last 12 Weeks' },
    { value: 'all-time', label: 'All Time' }
  ]

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch(`/api/system/logs/export?range=${selectedRange}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      // Get the CSV blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-logs-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Report downloaded successfully!')
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Preferences</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure application behavior and logging levels
          </p>
        </div>

        <div className="space-y-6">
          {/* Logging Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">System Logging</h2>
              <p className="text-sm text-gray-600 mt-1">
                Track and export user actions and system events
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Logging Status (Cosmetic) */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Logging Status</p>
                    <p className="text-xs text-gray-600">System logging is currently active</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-green-700">Enabled</span>
                  <div className="relative inline-flex items-center cursor-not-allowed opacity-75">
                    <input 
                      type="checkbox" 
                      checked={true}
                      disabled
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-green-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </div>
                </div>
              </div>

              {/* Export Logs Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Export Activity Logs</h3>
                  <p className="text-sm text-gray-600">
                    Download a CSV report of system activity for a specific time period
                  </p>
                </div>

                {/* Date Range Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Time Period
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {dateRangeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedRange(option.value)}
                        className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          selectedRange === option.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Report Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    intent="primary"
                    size="lg"
                  >
                    {isGenerating ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Report...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Report
                      </span>
                    )}
                  </Button>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Report Contents</p>
                      <p>The CSV will include: User name, Email, Action, Entity type, Entity ID, Timestamp, Details, and IP address for all logged activities in the selected time period.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Future Settings Sections */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Additional Settings</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 text-center py-8">
                More system configuration options coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

