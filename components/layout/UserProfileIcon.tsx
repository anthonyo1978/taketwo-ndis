"use client"

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'lib/contexts/SessionContext'
import { UserProfileDropdown } from './UserProfileDropdown'

export function UserProfileIcon() {
  const { user, isLoading } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef} data-tour="user-profile">
      {/* Profile Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="User profile menu"
      >
        {user.initials}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <UserProfileDropdown 
          user={user}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

