"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "components/Button/Button"
import { Input } from "components/ui/Input"
import { AUSTRALIAN_STATES, HOUSE_STATUSES } from "lib/constants"
import { houseCreateSchema, type HouseCreateSchemaType } from "lib/schemas/house"

/**
 * Props for the HouseForm component.
 */
interface HouseFormProps {
  onSubmit: (data: HouseCreateSchemaType) => Promise<void>
  isLoading?: boolean
  className?: string
  initialData?: Partial<HouseCreateSchemaType>
  mode?: 'create' | 'edit'
  onCancel?: () => void
}

/**
 * Form component for creating/editing houses.
 * 
 * @param props - The component props
 * @returns JSX element for the house form
 */
export function HouseForm({ onSubmit, isLoading = false, className, initialData, mode = 'create', onCancel }: HouseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<HouseCreateSchemaType>({
    resolver: zodResolver(houseCreateSchema),
    defaultValues: initialData || {
      status: 'Active',
      goLiveDate: new Date(),
    },
  })

  const handleFormSubmit = async (data: HouseCreateSchemaType) => {
    try {
      await onSubmit(data)
      // Don't reset form here - let the page handle redirect
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const submitDisabled = isSubmitting || isLoading

  return (
    <div className={className}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* House Descriptor Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">House Information</h3>
          
          <div>
            <label htmlFor="descriptor" className="block text-sm font-medium text-gray-700 mb-1">
              House Descriptor <span className="text-gray-500">(Optional)</span>
            </label>
            <Input
              id="descriptor"
              {...register("descriptor")}
              placeholder="e.g., 'Main Office', 'Client House A', 'Family Home'"
              className={errors.descriptor ? "border-red-500" : ""}
              disabled={submitDisabled}
            />
            {errors.descriptor && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.descriptor.message}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              A name to refer to the house by
            </p>
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Address Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="address1" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <Input
                id="address1"
                {...register("address1")}
                placeholder="123 Main Street"
                className={errors.address1 ? "border-red-500" : ""}
                disabled={submitDisabled}
              />
              {errors.address1 && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.address1.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                Unit/Apartment
              </label>
              <Input
                id="unit"
                {...register("unit")}
                placeholder="Apt 2B"
                disabled={submitDisabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="suburb" className="block text-sm font-medium text-gray-700 mb-1">
                Suburb/City <span className="text-red-500">*</span>
              </label>
              <Input
                id="suburb"
                {...register("suburb")}
                placeholder="Sydney"
                className={errors.suburb ? "border-red-500" : ""}
                disabled={submitDisabled}
              />
              {errors.suburb && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.suburb.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                id="state"
                {...register("state")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.state ? "border-red-500" : "border-gray-300"
                }`}
                disabled={submitDisabled}
              >
                <option value="">Select State</option>
                {AUSTRALIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.state.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                Postcode <span className="text-red-500">*</span>
              </label>
              <Input
                id="postcode"
                {...register("postcode")}
                placeholder="2000"
                maxLength={4}
                className={errors.postcode ? "border-red-500" : ""}
                disabled={submitDisabled}
              />
              {errors.postcode && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.postcode.message}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Property Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Property Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bedroomCount" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Bedrooms <span className="text-gray-500">(Optional)</span>
              </label>
              <Input
                id="bedroomCount"
                type="number"
                min="1"
                max="20"
                {...register("bedroomCount", { valueAsNumber: true })}
                placeholder="e.g., 3"
                className={errors.bedroomCount ? "border-red-500" : ""}
                disabled={submitDisabled}
              />
              {errors.bedroomCount && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.bedroomCount.message}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Used for occupancy tracking and analytics
              </p>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                {...register("status")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.status ? "border-red-500" : "border-gray-300"
                }`}
                disabled={submitDisabled}
              >
                {HOUSE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>
          
          {/* SDA Classification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="dwellingType" className="block text-sm font-medium text-gray-700 mb-1">
                Dwelling Type <span className="text-gray-500">(Optional)</span>
              </label>
              <select
                id="dwellingType"
                {...register("dwellingType")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={submitDisabled}
              >
                <option value="">Select Type</option>
                <option value="House">House</option>
                <option value="Villa">Villa</option>
                <option value="Apartment">Apartment</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Duplex">Duplex</option>
                <option value="Other">Other</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                SDA property type
              </p>
            </div>
            
            <div>
              <label htmlFor="sdaDesignCategory" className="block text-sm font-medium text-gray-700 mb-1">
                SDA Design Category <span className="text-gray-500">(Optional)</span>
              </label>
              <select
                id="sdaDesignCategory"
                {...register("sdaDesignCategory")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={submitDisabled}
              >
                <option value="">Select Category</option>
                <option value="Improved Liveability">Improved Liveability</option>
                <option value="Fully Accessible">Fully Accessible</option>
                <option value="Robust">Robust</option>
                <option value="High Physical Support">High Physical Support</option>
                <option value="Other/Unknown">Other/Unknown</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Design category
              </p>
            </div>
            
            <div>
              <label htmlFor="sdaRegistrationStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Registration Status <span className="text-gray-500">(Optional)</span>
              </label>
              <select
                id="sdaRegistrationStatus"
                {...register("sdaRegistrationStatus")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={submitDisabled}
              >
                <option value="">Select Status</option>
                <option value="Registered">Registered</option>
                <option value="In Progress">In Progress</option>
                <option value="Unknown">Unknown</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                SDA registration status
              </p>
            </div>
          </div>
          
          <div>
            <label htmlFor="goLiveDate" className="block text-sm font-medium text-gray-700 mb-1">
              Go-Live Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="goLiveDate"
              type="date"
              {...register("goLiveDate")}
              className={errors.goLiveDate ? "border-red-500" : ""}
              disabled={submitDisabled}
            />
            {errors.goLiveDate && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.goLiveDate.message}
              </p>
            )}
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              {...register("notes")}
              rows={3}
              placeholder="Additional notes about this property..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={submitDisabled}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={submitDisabled}
            className="min-w-32"
          >
            {submitDisabled 
              ? (mode === 'edit' ? "Saving..." : "Creating...") 
              : (mode === 'edit' ? "Save Changes" : "Create House")
            }
          </Button>
          <Button
            type="button"
            intent="secondary"
            onClick={() => {
              if (mode === 'edit' && onCancel) {
                onCancel()
              } else {
                reset()
              }
            }}
            disabled={submitDisabled}
          >
            {mode === 'edit' ? 'Cancel' : 'Clear Form'}
          </Button>
        </div>
      </form>
    </div>
  )
}