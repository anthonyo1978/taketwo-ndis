"use client"

import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useSession } from 'lib/contexts/SessionContext'

// ─── Rich HTML builders for tour steps ───

function welcomeStep() {
  return `
    <div class="haven-tour-hero-image">
      <img src="/assets/haven-night-sky.png" alt="" class="haven-tour-hero-bg" />
      <div class="haven-tour-hero-overlay">
        <p class="haven-tour-tagline">Finally, an operating system built for SDA providers</p>
      </div>
    </div>
    <div class="haven-tour-body">
      <p>
        Haven brings every part of your SDA business into one place&mdash;from spinning up new houses 
        and managing rooms, leases, and expenses, to onboarding participants, tracking income and costs, 
        and monitoring performance across your entire organisation.
      </p>
      <p>
        Clear dashboards, automation, reporting, and intelligent tools help you stay in 
        control&mdash;from the room level to the balance sheet.
      </p>
    </div>
  `
}

function dashboardStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        The <strong>Portfolio Dashboard</strong> gives you a complete view of your organisation.
      </p>
      <p>
        The <span class="haven-tour-highlight">Financial Overview</span> aggregates income and expenses across all houses, 
        with the ability to drill down into any property to investigate performance and costs.
      </p>
      <p>
        Switch to <span class="haven-tour-highlight">NDIS &amp; Operations</span> to see how your portfolio is performing 
        from an NDIS funding and efficiency perspective.
      </p>
      <div class="haven-tour-tip">
        <span class="haven-tour-tip-icon">💡</span>
        <span>Pro tip: Use filters and drill-down to move from a portfolio view to a single house or resident in seconds.</span>
      </div>
    </div>
  `
}

function housesStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>Houses are the foundation of Haven.</strong> Each house represents a property in your SDA portfolio, 
        with bedrooms, occupancy tracking, go-live dates, and financial reporting built in.
      </p>
      <p>
        Inside each house you can manage residents, expenses, head leases, suppliers, and view a complete 
        financial picture with <span class="haven-tour-highlight">milestones</span> and <span class="haven-tour-highlight">insights</span>.
      </p>
      <div class="haven-tour-tip">
        <span class="haven-tour-tip-icon">🏗️</span>
        <span>Start here: Add your first house, then assign residents when you're ready.</span>
      </div>
    </div>
  `
}

function residentsStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>Everything in Haven connects back to the people you support.</strong> Each resident profile brings together 
        personal details, NDIS funding contracts, funding management types, transaction overviews, history and 
        more&hellip; in one place.
      </p>
      <p>
        Link a resident to a house with an active funding contract, and Haven 
        <span class="haven-tour-highlight">automatically generates transactions</span>&mdash;daily, weekly, or 
        fortnightly&mdash;saving hours of manual work.
      </p>
    </div>
  `
}

function transactionsStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>Transactions are records of income and expense.</strong> Every expense type for your 
        organisation lives here.
      </p>
      <p>
        Haven makes it easy to create transactions with smart features like 
        <span class="haven-tour-highlight">End of Month roll-ups</span>, auto price calculation, 
        and <span class="haven-tour-highlight">automated creation</span>.
      </p>
    </div>
  `
}

function claimsStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>This is where your revenue comes together.</strong> Easily gather transactions into NDIA claims, 
        submit in a few clicks, track submission status, and reconcile payments&mdash;without double handling 
        or spreadsheet work.
      </p>
      <p>
        Haven formats everything the NDIA expects, so you can <span class="haven-tour-highlight">submit with confidence</span>. 
        Claiming, reconciliation, and error management are all handled in one place.
      </p>
    </div>
  `
}

function suppliersStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>Keep track of the suppliers who support your organisation.</strong> Store contact details, 
        manage services, and link suppliers to expenses, utilities, and invoices across Haven.
      </p>
      <p>
        Everything stays connected, so you always know who provides what&mdash;and what it costs.
      </p>
    </div>
  `
}

function settingsStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>The engine room.</strong> Settings is where you configure the magic — 
        <span class="haven-tour-highlight">automated billing</span>, user management, 
        organisation details, and system preferences.
      </p>
      <p>
        Toggle automation on, set billing frequencies per contract, and let Haven 
        create transactions while you sleep. You'll get a morning summary of everything it did.
      </p>
      <div class="haven-tour-tip">
        <span class="haven-tour-tip-icon">🤖</span>
        <span>Automation is Haven's superpower. Set it up once and reclaim hours every week.</span>
      </div>
    </div>
  `
}

function notificationsStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>Stay informed and in control.</strong> Notifications alert you to contract activations, 
        automated billing runs, NDIA communications, system activity, and anything requiring your attention.
      </p>
    </div>
  `
}

function notificationsPanelStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        This side panel gives you <strong>real-time alerts</strong> without leaving your current page. 
        Click the bell icon to see notifications, the clipboard for to-dos, and the clock for reminders.
      </p>
      <p>
        It's your quick-access hub — always one click away, no matter where you are in Haven.
      </p>
    </div>
  `
}

function reportingStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>Data-driven decisions.</strong> Generate detailed reports on income, expenses, 
        occupancy, and claims across your entire portfolio or individual houses.
      </p>
      <p>
        Export to CSV, view trends over time, and get the <span class="haven-tour-highlight">financial clarity</span> 
        you need to grow your SDA business with confidence.
      </p>
    </div>
  `
}

function helpStep() {
  return `
    <div class="haven-tour-body" style="padding-top:4px;">
      <p>
        <strong>You're never on your own.</strong> The Help Centre has quick-start guides, 
        training materials, FAQs, and detailed documentation for every feature.
      </p>
      <p>
        Whether you're onboarding a new team member or troubleshooting a claim, 
        the answer is probably already here.
      </p>
    </div>
  `
}

function finaleStep(firstName: string) {
  return `
    <div class="haven-tour-hero-image haven-tour-hero-image--short">
      <img src="/assets/haven-night-sky.png" alt="" class="haven-tour-hero-bg" />
      <div class="haven-tour-hero-overlay">
        <div style="font-size:36px;">🎉</div>
      </div>
    </div>
    <div class="haven-tour-body">
      <div class="haven-tour-finale">
        <p style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:4px;">
          You're all set${firstName ? `, ${firstName}` : ''}!
        </p>
        <p style="color:#64748b;font-size:13px;">
          You've just seen the highlights. Haven has so much more to offer — 
          and we're adding new features all the time.
        </p>
        <div class="haven-tour-checkmarks">
          <span class="haven-tour-check">✓ Houses</span>
          <span class="haven-tour-check">✓ Residents</span>
          <span class="haven-tour-check">✓ Transactions</span>
          <span class="haven-tour-check">✓ Claims</span>
          <span class="haven-tour-check">✓ Automation</span>
          <span class="haven-tour-check">✓ Reporting</span>
        </div>
        <p style="color:#475569;font-size:13px;margin-top:14px;">
          Click your <strong>profile icon</strong> anytime to restart this tour. 
          Now go build something amazing. 🚀
        </p>
        <div class="haven-tour-pill" style="margin-top:12px;justify-content:center;">
          🇦🇺 Proudly built in Australia for SDA providers
        </div>
      </div>
    </div>
  `
}

// ─── Tour Hook ───

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
    const firstName = user?.firstName || ''

    // Ensure sidebar is open and in Haven (dark) mode for the tour
    localStorage.setItem('admin-sidebar-collapsed', 'false')
    localStorage.setItem('haven-mode-enabled', 'true')
    // Dispatch storage events so the sidebar component picks up the changes immediately
    window.dispatchEvent(new StorageEvent('storage', { key: 'admin-sidebar-collapsed', newValue: 'false' }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'haven-mode-enabled', newValue: 'true' }))

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: '{{current}} of {{total}}',
      nextBtnText: '\u2192',
      prevBtnText: '\u2190',
      doneBtnText: 'Get Started \u2192',
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
        // Step 1: Grand welcome — no element highlight, centred popover
        {
          popover: {
            title: '',
            description: welcomeStep(),
            popoverClass: 'haven-tour-welcome-step',
          }
        },
        // Step 2: Dashboard
        {
          element: '[data-tour="dashboard-nav"]',
          popover: {
            title: '📊 The Portfolio Dashboard',
            description: dashboardStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 3: Houses
        {
          element: '[data-tour="houses-nav"]',
          popover: {
            title: '🏠 Houses — Your Portfolio',
            description: housesStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 4: Residents
        {
          element: '[data-tour="residents-nav"]',
          popover: {
            title: '👥 Residents — The Heart of Haven',
            description: residentsStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 5: Transactions
        {
          element: '[data-tour="transactions-nav"]',
          popover: {
            title: '💳 Transactions — Income & Expenditure',
            description: transactionsStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 6: Claims
        {
          element: '[data-tour="claims-nav"]',
          popover: {
            title: '📄 Claims — Get Paid',
            description: claimsStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 7: Suppliers
        {
          element: '[data-tour="suppliers-nav"]',
          popover: {
            title: '🔧 Suppliers',
            description: suppliersStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 8: Notifications
        {
          element: '[data-tour="notifications-nav"]',
          popover: {
            title: '🔔 Notifications & To-Dos',
            description: notificationsStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 9: Notifications Panel
        {
          element: '[data-tour="notifications-panel"]',
          popover: {
            title: '⚡ Quick Access Panel',
            description: notificationsPanelStep(),
            side: 'left',
            align: 'center'
          }
        },
        // Step 10: Reporting
        {
          element: '[data-tour="reporting-nav"]',
          popover: {
            title: '📈 Reporting & Insights',
            description: reportingStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 11: Settings
        {
          element: '[data-tour="settings-nav"]',
          popover: {
            title: '⚙️ Settings — The Engine Room',
            description: settingsStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 12: Help
        {
          element: '[data-tour="help-nav"]',
          popover: {
            title: '📚 Help Centre',
            description: helpStep(),
            side: 'right',
            align: 'start'
          }
        },
        // Step 13: Finale
        {
          element: '[data-tour="user-profile"]',
          popover: {
            title: '',
            description: finaleStep(firstName),
            side: 'left',
            align: 'end',
            popoverClass: 'haven-tour-welcome-step',
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

