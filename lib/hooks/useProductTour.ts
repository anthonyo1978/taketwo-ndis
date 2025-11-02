"use client"

import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useSession } from 'lib/contexts/SessionContext'

export function useProductTour() {
  const { user } = useSession()
  const [tourCompleted, setTourCompleted] = useState(true) // Default to true to prevent flash

  useEffect(() => {
    // Only run on client-side and when user is loaded
    if (!user) return

    // Check if tour was completed
    const completed = localStorage.getItem('haven-tour-completed')
    setTourCompleted(completed === 'true')

    // Auto-start tour on first login (desktop only)
    if (!completed && window.innerWidth >= 768) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        startTour()
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [user])

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: [
        {
          popover: {
            title: '👋 Welcome to Haven!',
            description: 'Let\'s take a quick 30-second tour to get you started. You can skip anytime or press ESC.'
          }
        },
        {
          element: '[data-tour="houses-nav"]',
          popover: {
            title: '🏠 Start with Houses',
            description: 'Create houses to organize your residents. This is the foundation of your setup.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="residents-nav"]',
          popover: {
            title: '👥 Add Residents',
            description: 'Add residents to your houses. Each resident needs to be active to enable billing.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="residents-nav"]',
          popover: {
            title: '📋 The Billing Flow',
            description: 'Remember: <strong>Active House → Active Resident → Active Contract</strong><br/>Only then can you generate bills!',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="settings-nav"]',
          popover: {
            title: '⚙️ Automation is Key',
            description: 'Set up automated billing in Settings to save hours each week. Haven can automatically generate transactions based on your schedule.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="user-profile"]',
          popover: {
            title: '✅ You\'re All Set!',
            description: 'Click your profile icon anytime to restart this tour. Happy managing!',
            side: 'left',
            align: 'end'
          }
        }
      ],
      onDestroyed: () => {
        // Mark tour as completed
        localStorage.setItem('haven-tour-completed', 'true')
        setTourCompleted(true)
      }
    })

    driverObj.drive()
  }

  const resetTour = () => {
    localStorage.removeItem('haven-tour-completed')
    setTourCompleted(false)
    startTour()
  }

  return {
    startTour,
    resetTour,
    tourCompleted
  }
}

