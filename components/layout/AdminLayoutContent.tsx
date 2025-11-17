"use client"

import { useState, ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { useSession } from 'lib/contexts/SessionContext'
import { useInactivityTimer } from 'lib/hooks/useInactivityTimer'
import { useProductTour } from 'lib/hooks/useProductTour'
import { AdminSidebar } from 'components/admin/AdminSidebar'
import { NotificationsPanel } from 'components/notifications/NotificationsPanel'
import { TodoProvider } from 'lib/contexts/TodoContext'
import { InactivityWarningModal } from './InactivityWarningModal'

interface AdminLayoutContentProps {
  children: ReactNode
}

export function AdminLayoutContent({ children }: AdminLayoutContentProps) {
  const { logout } = useSession()
  const [showWarning, setShowWarning] = useState(false)
  
  // Initialize product tour (auto-starts on first login)
  useProductTour()

  // Inactivity timer: 10 minutes timeout, show warning at 9 minutes
  const { isWarningShown, secondsRemaining, resetTimer, dismissWarning } = useInactivityTimer({
    timeout: 10 * 60 * 1000, // 10 minutes
    warningTime: 9 * 60 * 1000, // Show warning at 9 minutes
    onWarning: () => setShowWarning(true),
    onTimeout: async () => {
      await logout()
    },
    enabled: true
  })

  const handleStayLoggedIn = () => {
    setShowWarning(false)
    dismissWarning()
  }

  const handleLogoutNow = async () => {
    setShowWarning(false)
    await logout()
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Left Sidebar */}
        <AdminSidebar />
        
        {/* Main content area - no top bar, more space for content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Right Notifications Panel - Feature flag controlled */}
        <TodoProvider>
          <NotificationsPanel />
        </TodoProvider>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
          },
          success: {
            duration: 4000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 6000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Inactivity Warning Modal */}
      <InactivityWarningModal
        isOpen={showWarning && isWarningShown}
        secondsRemaining={secondsRemaining}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleLogoutNow}
      />
    </>
  )
}

