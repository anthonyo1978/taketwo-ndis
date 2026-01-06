"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OrganizationSettings, OrganizationSettingsUpdateInput } from 'types/organization'

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<OrganizationSettingsUpdateInput>({
    organizationName: '',
    abn: '',
    email: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    suburb: '',
    state: '',
    postcode: '',
    country: 'Australia',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/organization/settings')
      const result = await response.json() as {
        success: boolean
        data?: OrganizationSettings
        error?: string
      }
      
      if (result.success && result.data) {
        setSettings(result.data)
        setFormData({
          organizationName: result.data.organizationName || '',
          abn: result.data.abn || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          website: result.data.website || '',
          addressLine1: result.data.addressLine1 || '',
          addressLine2: result.data.addressLine2 || '',
          suburb: result.data.suburb || '',
          state: result.data.state || '',
          postcode: result.data.postcode || '',
          country: result.data.country || 'Australia',
        })
      } else {
        setError(result.error || 'Failed to load organisation settings')
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
      setError('Failed to load organisation settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)
      
      const response = await fetch('/api/organization/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const result = await response.json() as {
        success: boolean
        data?: OrganizationSettings
        error?: string
      }
      
      if (result.success) {
        setSettings(result.data!)
        setSuccessMessage('Organisation settings updated successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError(result.error || 'Failed to update settings')
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/settings')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Back to Settings
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Organisation Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your organisation's details and branding
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-600">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organisation Details</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation Name *
                </label>
                <input
                  type="text"
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your Organisation Name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be displayed on your dashboard and in reports
                </p>
              </div>

              <div>
                <label htmlFor="abn" className="block text-sm font-medium text-gray-700 mb-1">
                  ABN (Australian Business Number)
                </label>
                <input
                  type="text"
                  id="abn"
                  name="abn"
                  value={formData.abn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12 345 678 901"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="contact@yourorg.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1300 123 456"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  id="addressLine1"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Example Street"
                />
              </div>

              <div>
                <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="addressLine2"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Suite 456"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="suburb" className="block text-sm font-medium text-gray-700 mb-1">
                    Suburb
                  </label>
                  <input
                    type="text"
                    id="suburb"
                    name="suburb"
                    value={formData.suburb}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sydney"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="NSW"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                    Postcode
                  </label>
                  <input
                    type="text"
                    id="postcode"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2000"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Australia"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/settings')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

