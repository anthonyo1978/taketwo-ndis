"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "components/Button/Button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "components/ui/Dialog"
import { Input } from "components/ui/Input"
import { GENDER_OPTIONS } from "lib/constants"
import { residentUpdateSchema, type ResidentUpdateSchemaType } from "lib/schemas/resident"
import type { House } from "types/house"
import type { Resident } from "types/resident"

/**
 * Props for the ResidentEditForm component.
 */
interface ResidentEditFormProps {
  resident: Resident
  open: boolean
  onClose: () => void
  onSuccess?: (resident: Resident) => void
}

/**
 * Form component for editing existing residents.
 * Reuses the same structure and styling as the creation form for consistency.
 * 
 * @param props - The component props
 * @returns JSX element for the resident edit form
 */
export function ResidentEditForm({ resident, open, onClose, onSuccess }: ResidentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [houses, setHouses] = useState<House[]>([])
  const [selectedHouseId, setSelectedHouseId] = useState(resident.houseId || '')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<ResidentUpdateSchemaType>({
    resolver: zodResolver(residentUpdateSchema),
    defaultValues: {
      firstName: resident.firstName,
      lastName: resident.lastName,
      phone: resident.phone || '',
      email: resident.email || '',
      ndisId: resident.ndisId || '',
      notes: resident.notes || ''
    }
  })

  // Fetch houses for house assignment
  useEffect(() => {
    if (open) {
      const fetchHouses = async () => {
        try {
          const response = await fetch('/api/houses')
          const result = await response.json() as { success: boolean; data?: any[] }
          if (result.success) {
            setHouses(result.data || [])
          }
        } catch (error) {
          console.error('Failed to fetch houses:', error)
        }
      }
      fetchHouses()
    }
  }, [open])

  // Reset form when resident changes
  useEffect(() => {
    if (resident) {
      setValue('firstName', resident.firstName)
      setValue('lastName', resident.lastName)
      setValue('phone', resident.phone || '')
      setValue('email', resident.email || '')
      setValue('ndisId', resident.ndisId || '')
      setValue('notes', resident.notes || '')
      setSelectedHouseId(resident.houseId || '')
    }
  }, [resident, setValue])

  const handleFormSubmit = async (data: ResidentUpdateSchemaType) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/residents/${resident.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          houseId: selectedHouseId || null
        })
      })

      const result = await response.json() as { success: boolean; data?: any; error?: string }

      if (result.success) {
        onSuccess?.(result.data)
        onClose()
      } else {
        setSubmitError(result.error || 'Failed to update resident')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      reset()
      setSubmitError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Resident - {resident.firstName} {resident.lastName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Personal Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  placeholder="John"
                  className={errors.firstName ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  placeholder="Doe"
                  className={errors.lastName ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Display read-only fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                  {resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : 'Not set'}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Date of birth cannot be changed after creation
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                  {resident.gender}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Gender cannot be changed after creation
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Contact Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="0412 345 678"
                  className={errors.phone ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.phone.message}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="john.doe@example.com"
                  className={errors.email ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* NDIS Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">NDIS Information</h4>
            
            <div>
              <label htmlFor="ndisId" className="block text-sm font-medium text-gray-700 mb-1">
                NDIS Participant ID
              </label>
              <Input
                id="ndisId"
                {...register("ndisId")}
                placeholder="12345678"
                className={errors.ndisId ? "border-red-500" : ""}
                disabled={isSubmitting}
              />
              {errors.ndisId && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.ndisId.message}
                </p>
              )}
            </div>
          </div>

          {/* Photo Display */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Profile Photo</h4>
            
            <div className="flex items-center space-x-4">
              {(resident.photoUrl || resident.photoBase64) ? (
                <img
                  src={resident.photoUrl || resident.photoBase64}
                  alt={`${resident.firstName} ${resident.lastName}`}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                  <span className="text-gray-500 text-sm font-medium">
                    {resident.firstName.charAt(0)}{resident.lastName.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">
                  Current profile photo
                </p>
                <p className="text-xs text-gray-500">
                  Photo upload will be available in a future update
                </p>
              </div>
            </div>
          </div>

          {/* House Assignment */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">House Assignment</h4>
            
            <div>
              <label htmlFor="houseSelection" className="block text-sm font-medium text-gray-700 mb-1">
                Select House
              </label>
              <select
                id="houseSelection"
                value={selectedHouseId}
                onChange={(e) => setSelectedHouseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              >
                <option value="">No house assignment</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                     {house.descriptor || 'House'} - {house.address1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Additional Information</h4>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Basic Notes
              </label>
              <textarea
                id="notes"
                {...register("notes")}
                rows={3}
                placeholder="Additional notes about this resident..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.notes.message}
                </p>
              )}
            </div>

          </div>


          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
               intent="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Resident'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
