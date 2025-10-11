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

function SetupPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token')
  
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userInfo, setUserInfo] = useState<{ firstName: string; lastName: string } | null>(null)
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  // Debug: Watch form values
  const watchedPassword = watch('password')
  console.log('[FRONTEND] Form state:', {
    password: watchedPassword,
    passwordLength: watchedPassword?.length,
    errors: errors
  })

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid invitation link')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/validate-invite?token=${token}`)
        const result = await response.json() as { success: boolean; data?: { firstName: string; lastName: string; email: string }; error?: string }

        if (result.success && result.data) {
          setIsValid(true)
          setUserInfo(result.data)
        } else {
          setError(result.error || 'Invalid or expired invitation link')
        }
      } catch (err) {
        setError('Failed to validate invitation link')
      } finally {
        setIsLoading(false)
      }
    }

    validateToken()
  }, [token])

  const onSubmit = async (data: PasswordFormData) => {
    console.log('[FRONTEND] onSubmit called!', data)
    setIsSubmitting(true)
    setError('')

    // Debug logging to see what's happening
    console.log('[FRONTEND] Form submission:', {
      password: data.password,
      passwordLength: data.password?.length,
      confirmPassword: data.confirmPassword,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devToolsOpen: window.outerHeight - window.innerHeight > 100
    })

    try {
      const response = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password: data.password
        })
      })

      const result = await response.json() as { success: boolean; error?: string; requiresLogin?: boolean; message?: string }

      if (result.success) {
        if (result.requiresLogin) {
          // Password set but need to login manually
          setError('Password set successfully. Please sign in with your new password.')
          setIsSubmitting(false)
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        } else {
          // Successfully logged in automatically
          setIsSuccess(true)
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      } else {
        console.error('[FRONTEND] Setup password error:', result.error)
        
        // Handle specific error cases
        if (result.error?.includes('already exists')) {
          setError('Account already exists. Please sign in instead.')
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        } else {
          setError(result.error || 'Failed to set password')
        }
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
          src="/assets/ChatGPT Image Oct 11, 2025, 06_46_56 PM.png"
          alt="Haven - A warm welcome"
          fill
          className="object-cover object-left"
          priority
        />
      </div>

      {/* Right side - Password setup form (overlay on desktop, full-width on mobile) */}
      <div className="relative lg:absolute lg:right-0 lg:top-0 flex h-full lg:w-[40%] w-full items-center justify-center bg-white/95 px-6 lg:px-12 py-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile-only branding */}
          <div className="text-center lg:hidden">
            <h1 className="text-4xl font-bold text-gray-900">Haven</h1>
            <p className="mt-2 text-sm text-gray-600">Automate your SDA business</p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Validating your invitation...</p>
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
                <h2 className="mt-4 text-xl font-semibold text-red-900">Invalid Invitation</h2>
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
                <h2 className="mt-4 text-xl font-semibold text-green-900">Welcome to Haven!</h2>
                <p className="mt-2 text-sm text-green-700">
                  Your password has been set successfully.
                </p>
                <p className="mt-2 text-sm text-green-600">
                  Redirecting you to your dashboard...
                </p>
              </div>
            </div>
          )}

          {/* Password setup form */}
          {!isLoading && isValid && !isSuccess && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Set Your Password</h2>
                {userInfo && (
                  <p className="mt-2 text-sm text-gray-600">
                    Welcome, {userInfo.firstName} {userInfo.lastName}!
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-600">
                  Create a secure password to access your Haven account
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                  id="password"
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  autoComplete="new-password"
                  {...register('password')}
                />

                <Input
                  id="confirmPassword"
                  type="password"
                  label="Confirm Password"
                  placeholder="Re-enter your password"
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
                  {isSubmitting ? 'Setting up your account...' : 'Set Password & Continue'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SetupPasswordContent />
    </Suspense>
  )
}

