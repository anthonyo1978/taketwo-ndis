"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseInactivityTimerOptions {
  timeout: number // Milliseconds until auto-logout
  warningTime: number // Milliseconds before timeout to show warning
  onWarning: () => void // Called when warning should be shown
  onTimeout: () => void // Called when timeout is reached
  enabled?: boolean // Whether the timer is active
}

/**
 * Hook to track user inactivity and trigger warnings/logout
 * Resets on meaningful user interactions (clicks, form inputs, etc.)
 */
export function useInactivityTimer({
  timeout,
  warningTime,
  onWarning,
  onTimeout,
  enabled = true
}: UseInactivityTimerOptions) {
  const [isWarningShown, setIsWarningShown] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
  }, [])

  const startTimers = useCallback(() => {
    clearTimers()
    setIsWarningShown(false)

    if (!enabled) return

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      setIsWarningShown(true)
      onWarning()
      
      // Start countdown
      const warningDuration = (timeout - warningTime) / 1000
      setSecondsRemaining(Math.ceil(warningDuration))
      
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, warningTime)

    // Set auto-logout timer
    timeoutRef.current = setTimeout(() => {
      onTimeout()
    }, timeout)
  }, [timeout, warningTime, onWarning, onTimeout, enabled, clearTimers])

  const resetTimer = useCallback(() => {
    startTimers()
  }, [startTimers])

  const dismissWarning = useCallback(() => {
    setIsWarningShown(false)
    resetTimer()
  }, [resetTimer])

  // Track meaningful user activity
  useEffect(() => {
    if (!enabled) return

    // Events that indicate meaningful activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      if (isWarningShown) {
        // User is active while warning is shown - dismiss and reset
        dismissWarning()
      } else {
        // Normal activity - just reset timer
        resetTimer()
      }
    }

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Start initial timer
    startTimers()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      clearTimers()
    }
  }, [enabled, isWarningShown, resetTimer, dismissWarning, startTimers, clearTimers])

  return {
    isWarningShown,
    secondsRemaining,
    resetTimer,
    dismissWarning
  }
}

