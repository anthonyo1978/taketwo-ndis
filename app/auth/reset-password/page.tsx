"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Input } from 'components/ui/Input'
import { Button } from 'components/Button/Button'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type PasswordFormData = z.infer<typeof passwordSchema>

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid reset link')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const result = await response.json() as { success: boolean; error?: string }

        if (result.success) {
          setIsValid(true)
        } else {
          setError(result.error || 'Invalid or expired reset link')
        }
      } catch (err) {
        setError('Failed to validate reset link')
      }

      setIsLoading(false)
    }

    validateToken()
  }, [token])

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: data.password
        })
      })

      const result = await response.json() as { success: boolean; error?: string }

      if (result.success) {
        setIsSuccess(true)
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login?reset=success')
        }, 2000)
      } else {
        setError(result.error || 'Failed to reset password')
        setIsSubmitting(false)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Left-aligned background image */}
      <div className="absolute left-0 top-0 h-full w-[60%] hidden lg:block bg-gray-900">
        <Image
          src="/assets/image-small-text.png"
          alt="Haven - A warm welcome"
          fill
          className="object-cover object-left"
          priority
          unoptimized
        />
      </div>

      {/* Right side - Reset password form */}
      <div className="relative lg:absolute lg:right-0 lg:top-0 flex h-full lg:w-[40%] w-full items-center justify-center bg-white/95 px-6 lg:px-12 py-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile-only branding */}
          <div className="text-center lg:hidden">
            <h1 className="text-4xl font-bold text-gray-900">Haven</h1>
            <p className="mt-2 text-sm text-gray-600">Running an SDA business made easy</p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Validating reset link...</p>
            </div>
          )}

          {/* Invalid token */}
          {!isLoading && !isValid && (
            <div className="space-y-6 text-center">
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <svg
                  className="mx-auto h-12 w-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h2 className="mt-4 text-xl font-semibold text-red-900">Invalid Reset Link</h2>
                <p className="mt-2 text-sm text-red-700">{error}</p>
              </div>
              <Button
                type="button"
                intent="secondary"
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}

          {/* Success state */}
          {isSuccess && (
            <div className="space-y-6 text-center">
              <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                <svg
                  className="mx-auto h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="mt-4 text-xl font-semibold text-green-900">Password Reset!</h2>
                <p className="mt-2 text-sm text-green-700">
                  Your password has been updated successfully.
                </p>
                <p className="mt-2 text-sm text-green-600">
                  Redirecting you to login...
                </p>
              </div>
            </div>
          )}

          {/* Password reset form */}
          {!isLoading && isValid && !isSuccess && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Reset Your Password</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                  id="password"
                  type="password"
                  label="New Password"
                  placeholder="Enter your new password"
                  error={errors.password?.message}
                  autoComplete="new-password"
                  {...register('password')}
                />

                <Input
                  id="confirmPassword"
                  type="password"
                  label="Confirm Password"
                  placeholder="Re-enter your new password"
                  error={errors.confirmPassword?.message}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />

                {/* Password requirements */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• At least 8 characters</li>
                    <li>• One uppercase letter</li>
                    <li>• One lowercase letter</li>
                    <li>• One number</li>
                  </ul>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  intent="primary"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

