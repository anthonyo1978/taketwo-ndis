"use client"

import { useEffect, useState } from 'react'
import { Button } from 'components/Button/Button'

interface InactivityWarningModalProps {
  isOpen: boolean
  secondsRemaining: number
  onStayLoggedIn: () => void
  onLogout: () => void
}

export function InactivityWarningModal({ 
  isOpen, 
  secondsRemaining, 
  onStayLoggedIn,
  onLogout 
}: InactivityWarningModalProps) {
  const [countdown, setCountdown] = useState(secondsRemaining)

  useEffect(() => {
    setCountdown(secondsRemaining)
  }, [secondsRemaining])

  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Inactivity Warning
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            You've been inactive for a while. You'll be automatically logged out in:
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center">
          <div className="text-4xl font-bold text-yellow-600">
            {countdown}
          </div>
          <div className="ml-2 text-lg text-gray-600">
            second{countdown !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-center text-gray-600">
          Click below to continue your session.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            intent="secondary"
            onClick={onLogout}
            className="flex-1"
          >
            Log Out Now
          </Button>
          <Button
            intent="primary"
            onClick={onStayLoggedIn}
            className="flex-1"
          >
            Stay Logged In
          </Button>
        </div>
      </div>
    </div>
  )
}

