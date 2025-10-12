"use client"

import { useState, ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { useSession } from 'lib/contexts/SessionContext'
import { useInactivityTimer } from 'lib/hooks/useInactivityTimer'
import { AdminSidebar } from 'components/admin/AdminSidebar'
import { UserProfileIcon } from './UserProfileIcon'
import { InactivityWarningModal } from './InactivityWarningModal'

interface AdminLayoutContentProps {
  children: ReactNode
}

export function AdminLayoutContent({ children }: AdminLayoutContentProps) {
  const { logout } = useSession()
  const [showWarning, setShowWarning] = useState(false)

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
        {/* Sidebar */}
        <AdminSidebar />
        
        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          {/* Top bar with profile icon */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-end">
              <UserProfileIcon />
            </div>
          </div>
          
          {/* Page content */}
          <div className="h-full">
            {children}
          </div>
        </main>
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

