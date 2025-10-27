"use client"

import { useSession, SessionUser } from 'lib/contexts/SessionContext'

interface UserProfileDropdownProps {
  user: SessionUser
  onClose: () => void
}

export function UserProfileDropdown({ user, onClose }: UserProfileDropdownProps) {
  const { logout } = useSession()

  const handleLogout = async () => {
    onClose()
    await logout()
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      manager: 'bg-blue-100 text-blue-800 border-blue-200',
      staff: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[role] || colors.staff
  }

  return (
    <div className="absolute left-full ml-2 bottom-0 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-lg">
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {user.firstName} {user.lastName}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)} capitalize`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* User Details */}
      <div className="px-6 py-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
          <p className="mt-1 text-sm text-gray-900">{user.email}</p>
        </div>

        {user.phone && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
            <p className="mt-1 text-sm text-gray-900">{user.phone}</p>
          </div>
        )}

        {user.jobTitle && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Job Title</label>
            <p className="mt-1 text-sm text-gray-900">{user.jobTitle}</p>
          </div>
        )}
      </div>

      {/* Footer with Logout */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>
      </div>
    </div>
  )
}

