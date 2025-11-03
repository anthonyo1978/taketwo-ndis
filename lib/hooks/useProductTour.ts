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

    // Check if tour was completed or user is navigating from tour
    const completed = localStorage.getItem('haven-tour-completed')
    const navigating = localStorage.getItem('haven-tour-navigating')
    
    // Clear navigating flag after checking
    if (navigating) {
      localStorage.removeItem('haven-tour-navigating')
    }
    
    setTourCompleted(completed === 'true')

    // Auto-start tour on first login (desktop only), but not if user just clicked a link
    if (!completed && !navigating && window.innerWidth >= 768) {
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
      onDestroyed: () => {
        // Mark tour as completed
        localStorage.setItem('haven-tour-completed', 'true')
        setTourCompleted(true)
      },
      // Prevent tour from auto-restarting when clicking internal links
      onPopoverRender: (popover, { config, state }) => {
        // Add click handler to links that marks tour as "user navigating"
        const links = popover.wrapper.querySelectorAll('a')
        links.forEach(link => {
          link.addEventListener('click', () => {
            // Temporarily mark as completed so tour doesn't auto-restart
            localStorage.setItem('haven-tour-navigating', 'true')
            // Destroy the tour when user clicks a link
            driverObj.destroy()
          })
        })
      },
      steps: [
        {
          popover: {
            title: '👋 Welcome to Haven!',
            description: 'Haven helps you manage houses, residents, transactions, and claiming. Let\'s take a quick 30-second tour to get you started. You can skip anytime or press ESC.'
          }
        },
        {
          element: '[data-tour="houses-nav"]',
          popover: {
            title: '🏠 Start with Houses',
            description: 'Create houses to organise your residents. This is the foundation of your setup.<br/><br/><a href="/help/user-guide#managing-houses" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs font-medium">📖 Learn more about Houses →</a>',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="residents-nav"]',
          popover: {
            title: '👥 Create Residents',
            description: 'Create residents and add them to your houses. Each resident record carries important resident details, including contact details, funding details, and preferences.<br/><br/><a href="/help/user-guide#managing-residents" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs font-medium">📖 Learn more about Residents →</a>',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="transactions-nav"]',
          popover: {
            title: '💳 Transactions',
            description: 'Transactions are records of service delivery, and they live here. Remember: <strong>Active House → Active Resident (linked to house) → Active Contract</strong> — only then can you generate transactions.<br/><br/><a href="/help/user-guide#transactions--billing" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs font-medium">📖 Learn more about Transactions →</a>',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="claims-nav"]',
          popover: {
            title: '📄 Claiming',
            description: 'In this section, you can build your claims and automatically send them to the NDIA or create downloadable files.<br/><br/><a href="/help/user-guide#claims-management" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs font-medium">📖 Learn more about Claims →</a>',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="settings-nav"]',
          popover: {
            title: '⚙️ Automation is Key',
            description: 'In Settings, you can easily set up automation to automatically create transactions. This section also allows much configuration of the system and user management.<br/><br/><a href="/help/user-guide#automated-billing" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs font-medium">📖 Learn more about Automation →</a>',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-tour="help-nav"]',
          popover: {
            title: '📚 Help Center',
            description: 'Quick Start guides, Training materials, FAQs, and in-depth documentation all live here. Access them anytime you need help.<br/><br/><a href="/help" class="text-blue-500 hover:text-blue-700 text-xs font-medium">📖 Browse all guides →</a>',
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
      ]
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

