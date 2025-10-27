"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { Button } from "components/Button/Button"
import { Input } from "components/ui/Input"

// Automation settings schema (simplified for multi-tenant)
const automationSettingsSchema = z.object({
  enabled: z.boolean(),
  adminEmails: z.array(z.string().email("Invalid email address"))
    .min(1, "At least one admin email is required"),
  notificationSettings: z.object({
    frequency: z.enum(["endOfRun", "endOfWeek", "off"]),
    includeLogs: z.boolean()
  }),
  errorHandling: z.object({
    continueOnError: z.boolean()
  })
})

type AutomationSettingsData = z.infer<typeof automationSettingsSchema>

interface AutomationSettings {
  id?: string
  organizationId: string
  enabled: boolean
  adminEmails: string[]
  notificationSettings: {
    frequency: "endOfRun" | "endOfWeek" | "off"
    includeLogs: boolean
  }
  errorHandling: {
    continueOnError: boolean
  }
  createdAt?: string
  updatedAt?: string
}

export function AutomationSettingsPage() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [formValues, setFormValues] = useState<any>(null)
  const [showEligibleContracts, setShowEligibleContracts] = useState(false)
  const [eligibleContracts, setEligibleContracts] = useState<Record<string, any[]>>({})
  const [isLoadingEligible, setIsLoadingEligible] = useState(false)
  const [showTransactionPreview, setShowTransactionPreview] = useState(false)
  const [transactionPreview, setTransactionPreview] = useState<any>(null)
  const [isGeneratingTransactions, setIsGeneratingTransactions] = useState(false)
  const [showRunResults, setShowRunResults] = useState(false)
  const [runResults, setRunResults] = useState<any>(null)

  const form = useForm<AutomationSettingsData>({
    resolver: zodResolver(automationSettingsSchema),
    defaultValues: {
      enabled: false,
      adminEmails: [],
      notificationSettings: {
        frequency: "endOfRun",
        includeLogs: true
      },
      errorHandling: {
        continueOnError: true
      }
    }
  })

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Debug: Watch form values changes (commented out for production)
  // useEffect(() => {
  //   const subscription = form.watch((value, { name, type }) => {
  //     console.log('Form field changed:', { name, type, value })
  //   })
  //   return () => subscription.unsubscribe()
  // }, [form])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/automation/settings')
      if (response.ok) {
        const data = await response.json() as {
          success: boolean
          data?: AutomationSettings
          error?: string
        }
        if (data.success && data.data) {
          console.log('Fetched settings data:', data.data)
          setSettings(data.data)
          
          // Create a properly structured object for form reset
          const formData = {
            enabled: data.data.enabled,
            adminEmails: data.data.adminEmails,
            notificationSettings: {
              frequency: data.data.notificationSettings.frequency,
              includeLogs: data.data.notificationSettings.includeLogs
            },
            errorHandling: {
              continueOnError: data.data.errorHandling.continueOnError
            }
          }
          
          console.log('Resetting form with:', formData)
          
          // Reset form with the loaded data
          form.reset(formData, { keepDefaultValues: false })
          
          // Clear any validation errors
          form.clearErrors()
          
          // Update form values state to trigger re-renders
          setFormValues(formData)
          
          // Force form to re-validate
          form.trigger()
          
          // Debug: Check form values after reset (commented out for production)
          // setTimeout(() => {
          //   console.log('Form values after reset:', form.getValues())
          //   console.log('Form watch values:', {
          //     'notificationSettings.frequency': form.watch('notificationSettings.frequency'),
          //     'notificationSettings.includeLogs': form.watch('notificationSettings.includeLogs'),
          //     'errorHandling.continueOnError': form.watch('errorHandling.continueOnError')
          //   })
          // }, 100)
        }
      }
    } catch (error) {
      console.error('Error loading automation settings:', error)
      setError('Failed to load automation settings')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: AutomationSettingsData) => {
    try {
      const submitData = {
        ...data
      }
      
      console.log('Submitting form data:', submitData)
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/automation/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('API Error response:', errorText)
      }

      const result = await response.json() as {
        success: boolean
        data?: AutomationSettings
        error?: string
      }

      if (result.success) {
        setSettings(result.data || null)
        setShowSuccessModal(true)
        
        // Redirect to main settings page after modal is shown
        setTimeout(() => {
          window.location.href = '/settings'
        }, 2000)
      } else {
        setError(result.error || 'Failed to save automation settings')
      }
    } catch (error) {
      console.error('Error saving automation settings:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const addAdminEmail = () => {
    const currentEmails = form.getValues("adminEmails")
    const newEmails = [...currentEmails, ""]
    form.setValue("adminEmails", newEmails)
    setFormValues((prev: any) => ({ ...prev, adminEmails: newEmails }))
  }

  const removeAdminEmail = (index: number) => {
    const currentEmails = form.getValues("adminEmails")
    const newEmails = currentEmails.filter((_, i) => i !== index)
    form.setValue("adminEmails", newEmails)
    setFormValues((prev: any) => ({ ...prev, adminEmails: newEmails }))
  }

  const updateAdminEmail = (index: number, value: string) => {
    const currentEmails = form.getValues("adminEmails")
    const updatedEmails = [...currentEmails]
    updatedEmails[index] = value
    form.setValue("adminEmails", updatedEmails)
    setFormValues((prev: any) => ({ ...prev, adminEmails: updatedEmails }))
  }

  const fetchEligibleContracts = async () => {
    try {
      setIsLoadingEligible(true)
      const response = await fetch('/api/automation/preview-3-days')
      const data = await response.json() as {
        success: boolean
        data?: {
          contractsByDay: Record<string, any[]>
          summary: {
            totalScheduledRuns: number
            uniqueContracts: number
            totalAmount: number
            days: number
          }
        }
        error?: string
      }
      
      if (data.success && data.data) {
        // Convert the contractsByDay format to our display format
        setEligibleContracts(data.data.contractsByDay)
        setShowEligibleContracts(true)
      } else {
        setError(data.error || 'Failed to fetch eligible contracts')
      }
    } catch (error) {
      console.error('Error fetching eligible contracts:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoadingEligible(false)
    }
  }

  const previewTransactions = async () => {
    setIsLoadingEligible(true)
    try {
      const response = await fetch('/api/automation/generate-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview' })
      })
      const result = await response.json() as {
        success: boolean
        data?: any
        error?: string
      }
      
      if (result.success) {
        setTransactionPreview(result.data)
        setShowTransactionPreview(true)
      } else {
        setError(result.error || 'Failed to preview transactions')
      }
    } catch (error) {
      setError('Failed to preview transactions')
    } finally {
      setIsLoadingEligible(false)
    }
  }

  const generateTransactions = async () => {
    setIsGeneratingTransactions(true)
    try {
      const response = await fetch('/api/automation/generate-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      })
      const result = await response.json() as {
        success: boolean
        data?: any
        error?: string
      }
      
      if (result.success) {
        setSuccess(`Successfully generated ${result.data.successfulTransactions} transactions for ${result.data.processedContracts} contracts`)
        setShowTransactionPreview(false)
        setTransactionPreview(null)
        // Refresh eligible contracts
        fetchEligibleContracts()
      } else {
        setError(result.error || 'Failed to generate transactions')
      }
    } catch (error) {
      setError('Failed to generate transactions')
    } finally {
      setIsGeneratingTransactions(false)
    }
  }

  const runAutomationNow = async () => {
    setIsGeneratingTransactions(true)
    setError(null)
    setSuccess(null)
    
    try {
      // First, check if automation already ran today
      const today = new Date().toISOString().split('T')[0]
      const checkResponse = await fetch('/api/automation/logs/today')
      
      if (checkResponse.ok) {
        const checkResult = await checkResponse.json() as {
          success: boolean
          alreadyRan?: boolean
          lastRun?: any
        }
        
        if (checkResult.alreadyRan && checkResult.lastRun) {
          const runTime = new Date(checkResult.lastRun.run_date).toLocaleTimeString('en-AU', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Australia/Sydney'
          })
          setError(`⚠️ Automation has already run today at ${runTime}. Cannot run again until tomorrow.`)
          setIsGeneratingTransactions(false)
          return
        }
      }
      
      // Proceed with automation run
      const response = await fetch('/api/automation/cron', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json() as {
        success: boolean
        data?: any
        message?: string
        skipped?: boolean
        error?: string
      }
      
      if (result.success) {
        if (result.skipped) {
          setError(result.message || 'Automation run was skipped')
        } else if (result.data) {
          // Store results and show modal
          setRunResults(result.data)
          setShowRunResults(true)
          // Clear any previous errors
          setError(null)
        } else {
          setSuccess('Automation run completed')
        }
      } else {
        setError(result.error || 'Failed to run automation')
      }
    } catch (error) {
      setError('Network error. Please try again.')
      console.error('Error running automation:', error)
    } finally {
      setIsGeneratingTransactions(false)
    }
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
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="size-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Automation Settings</h1>
            </div>
          </div>
          <p className="text-gray-600">Configure automated billing and transaction generation for your organization.</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 text-sm">{success}</div>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" key={settings?.id || 'loading'}>
          {/* Global Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Global Settings</h2>
            
            <div className="space-y-6">
              {/* Enable Automation */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Enable Automation</label>
                  <p className="text-sm text-gray-500">Turn on automated billing for eligible contracts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues?.enabled || false}
                    onChange={(e) => {
                      form.setValue('enabled', e.target.checked)
                       setFormValues((prev: any) => ({ ...prev, enabled: e.target.checked }))
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Info about automated scheduling */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      ⏰ Automated Schedule
                    </p>
                    <p className="text-sm text-blue-800">
                      Automation runs daily at <strong>12:00 AM UTC (midnight)</strong> for all organizations. 
                      Eligible contracts are processed automatically and notifications are sent to admin emails.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Email Notifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Admin Email Notifications</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email Addresses
                </label>
                <p className="text-sm text-gray-500 mb-4">Email addresses that will receive automation notifications</p>
                
                <div className="space-y-3">
                  {(formValues?.adminEmails || []).map((email: any, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => updateAdminEmail(index, e.target.value)}
                        placeholder="admin@example.com"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeAdminEmail(index)}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addAdminEmail}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Email Address
                  </button>
                </div>
                
                {form.formState.errors.adminEmails && (
                  <p className="text-red-600 text-sm mt-2">{form.formState.errors.adminEmails.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notification Frequency
                </label>
                <div className="space-y-3">
                  {[
                    { value: "endOfRun", label: "End of Run", description: "At the end of each night's run receive a notification (and log if enabled)" },
                    { value: "endOfWeek", label: "End of Week", description: "At the end of each week's run receive a notification (and log if enabled)" },
                    { value: "off", label: "Off", description: "No notifications" }
                  ].map(({ value, label, description }) => (
                    <label key={value} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="notificationSettings.frequency"
                        value={value}
                        checked={formValues?.notificationSettings?.frequency === value}
                        onChange={(e) => {
                          form.setValue('notificationSettings.frequency', e.target.value as any)
                          setFormValues((prev: any) => ({ 
                            ...prev, 
                            notificationSettings: { 
                              ...prev.notificationSettings, 
                              frequency: e.target.value as any 
                            } 
                          }))
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{label}</div>
                        <div className="text-sm text-gray-500">{description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {(formValues?.notificationSettings?.frequency || "off") !== "off" && (
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Include Logs in Notifications</label>
                    <p className="text-sm text-gray-500">Include detailed logs in email notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formValues?.notificationSettings?.includeLogs || false}
                      onChange={(e) => {
                        form.setValue('notificationSettings.includeLogs', e.target.checked)
                        setFormValues((prev: any) => ({ 
                          ...prev, 
                          notificationSettings: { 
                            ...prev.notificationSettings, 
                            includeLogs: e.target.checked 
                          } 
                        }))
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}
            </div>
          </div>


          {/* Error Handling */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Error Handling</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Continue on Error</label>
                  <p className="text-sm text-gray-500">Continue processing other contracts if one fails</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues?.errorHandling?.continueOnError || false}
                    onChange={(e) => {
                      form.setValue('errorHandling.continueOnError', e.target.checked)
                      setFormValues((prev: any) => ({ 
                        ...prev, 
                        errorHandling: { 
                          ...prev.errorHandling, 
                          continueOnError: e.target.checked 
                        } 
                      }))
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Testing Tools Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Testing & Debugging Tools</h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Use these tools to preview and test automation behavior before it runs automatically.
              </p>
              
              <div className="flex space-x-4">
                <Button
                  type="button"
                  onClick={fetchEligibleContracts}
                  disabled={isLoadingEligible || isSaving}
                  className="px-6 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {isLoadingEligible ? 'Loading...' : '🔍 Preview Next 3 Days'}
                </Button>
                
                <Button
                  type="button"
                  onClick={runAutomationNow}
                  disabled={isGeneratingTransactions || isSaving}
                  className="px-6 py-2 text-white bg-purple-600 border border-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-semibold"
                >
                  {isGeneratingTransactions ? 'Running...' : '🚀 Run Automation Now'}
                </Button>
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex justify-between">
            <div></div>
            <div className="flex space-x-4">
              <Button
                type="button"
                onClick={() => {
                  // Reset form to default values
                  const defaultValues = {
                    enabled: false,
                    adminEmails: [],
                    notificationSettings: {
                      frequency: "endOfRun" as const,
                      includeLogs: true
                    },
                    errorHandling: {
                      continueOnError: true
                    }
                  }
                  
                  form.reset(defaultValues)
                  setFormValues(defaultValues)
                  setError(null)
                  setSuccess(null)
                }}
                disabled={isSaving}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Settings Saved Successfully!
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Your automation settings have been saved and will take effect immediately.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  window.location.href = '/settings'
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Eligible Contracts Modal */}
      {showEligibleContracts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Preview Next 3 Days
              </h3>
              <button
                onClick={() => setShowEligibleContracts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {Object.keys(eligibleContracts).length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Transactions</h4>
                <p className="text-gray-600">
                  No contracts are scheduled to run in the next 3 days. This could be because:
                </p>
                <ul className="text-gray-600 text-sm mt-2 space-y-1">
                  <li>• No contracts have automation enabled</li>
                  <li>• All next run dates are more than 3 days away</li>
                  <li>• Contracts don't meet eligibility criteria</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Object.values(eligibleContracts as Record<string, any[]>).flat().length}
                      </div>
                      <div className="text-sm text-blue-800">Total Runs</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {new Set(Object.values(eligibleContracts as Record<string, any[]>).flat().map((c: any) => c.contractId)).size}
                      </div>
                      <div className="text-sm text-blue-800">Unique Contracts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        ${Object.values(eligibleContracts as Record<string, any[]>).flat().reduce((sum: number, c: any) => sum + (c.transactionAmount || 0), 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-green-800">Total Amount</div>
                    </div>
                  </div>
                </div>
                
                {/* Contracts grouped by day */}
                {(() => {
                  // Sort dates chronologically
                  const sortedDates = Object.keys(eligibleContracts).sort()
                  
                  return sortedDates.map((date) => {
                    const contracts = (eligibleContracts as Record<string, any[]>)[date] || []
                    const dateObj = new Date(date + 'T00:00:00')
                    const dayName = dateObj.toLocaleDateString('en-AU', { weekday: 'long' })
                    const formattedDate = dateObj.toLocaleDateString('en-AU', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })
                    
                    // Get today for comparison (Australia timezone)
                    const today = new Date().toLocaleDateString('en-AU', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      timeZone: 'Australia/Sydney'
                    }).split('/').reverse().join('-') // Convert DD/MM/YYYY to YYYY-MM-DD
                    const isToday = date === today
                    
                    return (
                      <div key={date} className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isToday ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isToday ? '📅 Today' : dayName}
                          </div>
                          <div className="text-lg font-semibold text-gray-900">
                            {formattedDate}
                          </div>
                          <div className="text-sm text-gray-500">
                            ({contracts.length} transaction{contracts.length !== 1 ? 's' : ''})
                          </div>
                        </div>
                        
                        <div className="space-y-3 ml-4">
                          {contracts.map((contract: any, index: number) => {
                            return (
                              <div key={`${contract.contractId}-${date}-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="font-medium text-gray-900">
                                        {contract.residentName}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      <span className="text-sm text-gray-600">
                                        {contract.houseName}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Transaction Amount:</span>
                                        <div className="font-medium text-green-600">
                                          ${contract.transactionAmount.toFixed(2)}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Frequency:</span>
                                        <div className="font-medium text-gray-900 capitalize">
                                          {contract.frequency}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Next Run After:</span>
                                        <div className="font-medium text-blue-600">
                                          {new Date(contract.nextRunDateAfter).toLocaleDateString('en-AU')}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Balance After:</span>
                                        <div className={`font-medium ${contract.balanceAfterTransaction >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                          ${contract.balanceAfterTransaction.toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Contract: {contract.contractType} • Current: ${contract.currentBalance.toFixed(2)}</span>
                                    {!contract.hasSufficientBalance && (
                                      <span className="text-red-600 font-medium">⚠️ Insufficient Balance</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowEligibleContracts(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Preview Modal */}
      {showTransactionPreview && transactionPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Transaction Preview
              </h3>
              <button
                onClick={() => setShowTransactionPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-800 font-medium">
                    {transactionPreview.eligibleContracts} contract{transactionPreview.eligibleContracts !== 1 ? 's' : ''} ready for transaction generation
                  </span>
                </div>
                <div className="mt-2 text-blue-700">
                  <strong>Total Amount:</strong> ${transactionPreview.totalAmount.toFixed(2)}
                </div>
              </div>
              
              <div className="space-y-3">
                {transactionPreview.previewTransactions.map((transaction: any) => (
                  <div key={transaction.contractId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {transaction.residentName}
                        </h4>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div><strong>Amount:</strong> ${transaction.amount.toFixed(2)}</div>
                          <div><strong>Frequency:</strong> {transaction.frequency}</div>
                          <div><strong>Current Balance:</strong> ${transaction.currentBalance.toFixed(2)}</div>
                          <div><strong>New Balance:</strong> ${transaction.newBalance.toFixed(2)}</div>
                          <div><strong>Next Run:</strong> {transaction.nextRunDate}</div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setShowTransactionPreview(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={generateTransactions}
                  disabled={isGeneratingTransactions}
                  className="px-4 py-2 text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isGeneratingTransactions ? 'Generating...' : 'Generate Transactions'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Run Automation Results Modal */}
      {showRunResults && runResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Automation Run Results
              </h3>
              <button
                onClick={() => setShowRunResults(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {runResults.processedContracts === 0 ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Nothing to Process Today
                </h4>
                <p className="text-gray-600 mb-4">
                  No contracts are scheduled to run today.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-blue-900 mb-2">This could be because:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• All contracts have <strong>next_run_date</strong> in the future</li>
                    <li>• Contracts are expired or don't meet eligibility criteria</li>
                    <li>• No contracts have automation enabled</li>
                  </ul>
                </div>
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    💡 <strong>Tip:</strong> Use "Preview Next 3 Days" to see when contracts are scheduled.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-lg font-semibold text-green-900">
                        ✅ Automation Completed Successfully!
                      </h4>
                      <p className="text-sm text-green-700">
                        {runResults.successfulTransactions} transaction{runResults.successfulTransactions !== 1 ? 's' : ''} created in DRAFT status
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {runResults.processedContracts}
                    </div>
                    <div className="text-sm text-blue-800 mt-1">
                      Contract{runResults.processedContracts !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {runResults.successfulTransactions}
                    </div>
                    <div className="text-sm text-green-800 mt-1">
                      Transaction{runResults.successfulTransactions !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      ${runResults.totalAmount?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-purple-800 mt-1">
                      Total Amount
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900 mb-1">
                        📝 Transactions Require Approval
                      </p>
                      <p className="text-sm text-yellow-800">
                        All transactions are in <strong>DRAFT</strong> status. Please review and post them in the Transactions page.
                      </p>
                    </div>
                  </div>
                </div>

                {runResults.failedTransactions > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 className="font-medium text-red-900 mb-2">
                      ⚠️ {runResults.failedTransactions} Failed
                    </h5>
                    <p className="text-sm text-red-800">
                      Some contracts could not be processed. Check automation logs for details.
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600">
                    <strong>Execution Time:</strong> {runResults.executionTime}ms
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-between">
              {runResults.processedContracts > 0 && (
                <button
                  onClick={() => window.location.href = '/transactions'}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Transactions →
                </button>
              )}
              <button
                onClick={() => setShowRunResults(false)}
                className={`px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${runResults.processedContracts === 0 ? 'w-full' : ''}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}