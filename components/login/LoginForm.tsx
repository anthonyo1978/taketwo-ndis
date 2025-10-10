"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "components/Button/Button"
import { Input } from "components/ui/Input"
import { LoginCredentials, LoginResponse } from "lib/types/auth"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export interface LoginFormProps {
  onSuccess?: () => void
  className?: string
}

export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const [loginError, setLoginError] = useState<string>("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginCredentials) => {
    setLoginError("")
    setIsLoggingIn(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = (await response.json()) as LoginResponse

      if (response.ok && result.success) {
        // Call success callback or redirect to dashboard
        if (onSuccess) {
          onSuccess()
        } else {
          // Redirect to dashboard
          window.location.href = "/dashboard"
        }
      } else {
        setLoginError("Invalid credentials")
        setIsLoggingIn(false)
      }
    } catch (error) {
      console.error("Login error:", error)
      setLoginError("Network error. Please check your connection and try again.")
      setIsLoggingIn(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = getValues("email")
    
    if (!email || !email.includes("@")) {
      setLoginError("Please enter your email address first")
      return
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setResetEmailSent(true)
        setLoginError("")
      } else {
        setLoginError("Unable to send reset email. Please try again.")
      }
    } catch (error) {
      console.error("Password reset error:", error)
      setLoginError("Network error. Please try again.")
    }
  }

  // Show loading animation overlay when logging in
  if (isLoggingIn) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-12">
        {/* Haven House Loading Animation */}
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 120 120" className="animate-pulse">
            {/* House outline */}
            <path
              d="M60 20 L20 50 L20 100 L100 100 L100 50 Z"
              fill="#e0e7ff"
              stroke="#4f46e5"
              strokeWidth="2"
            />
            {/* Roof */}
            <path d="M10 50 L60 10 L110 50" fill="none" stroke="#4f46e5" strokeWidth="3" />
            {/* Door */}
            <rect x="50" y="70" width="20" height="30" fill="#4f46e5" />
            {/* Windows with animated lights */}
            <rect x="30" y="60" width="12" height="12" fill="#fbbf24" className="animate-pulse" />
            <rect x="78" y="60" width="12" height="12" fill="#fbbf24" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
            <rect x="30" y="40" width="12" height="12" fill="#fbbf24" className="animate-pulse" style={{ animationDelay: '1s' }} />
            <rect x="78" y="40" width="12" height="12" fill="#fbbf24" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-700">Welcome back...</p>
        <p className="text-sm text-gray-500">Taking you to your dashboard</p>
      </div>
    )
  }

  // Show password reset success message
  if (resetEmailSent) {
    return (
      <div className="space-y-4 text-center">
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
              d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-green-900">Check your email</h3>
          <p className="mt-2 text-sm text-green-700">
            We've sent you a password reset link. Please check your inbox.
          </p>
        </div>
        <Button
          type="button"
          intent="secondary"
          onClick={() => {
            setResetEmailSent(false)
            setShowForgotPassword(false)
          }}
          className="w-full"
        >
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${className || ""}`} noValidate>
      <div className="space-y-4">
        <Input
          {...register("email")}
          id="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          error={errors.email?.message}
          autoComplete="username"
          required
          aria-describedby={errors.email ? "email-error" : undefined}
        />

        <Input
          {...register("password")}
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          error={errors.password?.message}
          autoComplete="current-password"
          required
          aria-describedby={errors.password ? "password-error" : undefined}
        />
      </div>

      {/* Forgot password link */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {loginError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          aria-live="polite"
        >
          {loginError}
        </div>
      )}

      <Button
        type="submit"
        intent="primary"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
        aria-describedby={isSubmitting ? "loading-description" : undefined}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>

      {isSubmitting && (
        <div id="loading-description" className="sr-only" aria-live="polite">
          Please wait while we sign you in
        </div>
      )}
    </form>
  )
}
