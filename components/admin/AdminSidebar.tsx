"use client"

import * as Tooltip from "@radix-ui/react-tooltip"
import { 
  Bell,
  ChevronLeft,
  CreditCard, 
  FileCheck,
  HelpCircle,
  Home, 
  LayoutDashboard, 
  Settings, 
  Users
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"

import { Button } from "components/Button/Button"
import { NavItem } from "./NavItem"
import { UserProfileIcon } from "components/layout/UserProfileIcon"

const NAVIGATION_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exactMatch: true,
    tourId: "dashboard-nav",
  },
  {
    label: "Houses",
    href: "/houses",
    icon: Home,
    tourId: "houses-nav",
  },
  {
    label: "Residents",
    href: "/residents",
    icon: Users,
    tourId: "residents-nav",
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: CreditCard,
    tourId: "transactions-nav",
  },
  {
    label: "Claims",
    href: "/claims",
    icon: FileCheck,
    tourId: "claims-nav",
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    tourId: "notifications-nav",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    tourId: "settings-nav",
  },
  {
    label: "Help",
    href: "/help",
    icon: HelpCircle,
    tourId: "help-nav",
  },
] as const

const STORAGE_KEY = "admin-sidebar-collapsed"

/**
 * Props for the AdminSidebar component.
 */
export interface AdminSidebarProps {
  className?: string
}

/**
 * Collapsible sidebar component for admin navigation.
 * 
 * @param props - The component props
 * @returns JSX element for the admin sidebar
 */
export function AdminSidebar({ className }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true) // Default to collapsed
  const [mounted, setMounted] = useState(false)
  const [havenMode, setHavenMode] = useState(false)

  // Load collapsed state and Haven mode from localStorage on client-side
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(JSON.parse(stored) as boolean)
    } else {
      // If no stored preference, default to collapsed
      setIsCollapsed(true)
    }
    // Load Haven mode
    const storedHavenMode = localStorage.getItem('haven-mode-enabled')
    if (storedHavenMode !== null) {
      setHavenMode(JSON.parse(storedHavenMode) as boolean)
    }
  }, [])

  // Listen for Haven mode changes (when toggled in settings)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'haven-mode-enabled') {
        setHavenMode(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    // Also listen for changes in the same window
    const interval = setInterval(() => {
      const stored = localStorage.getItem('haven-mode-enabled')
      if (stored !== null) {
        const newValue = JSON.parse(stored) as boolean
        if (newValue !== havenMode) {
          setHavenMode(newValue)
        }
      }
    }, 500) // Check every 500ms

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [havenMode])

  // Save collapsed state to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed))
    }
  }, [isCollapsed, mounted])

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed)
  }

  // Night sky background with stars for Haven mode
  const havenModeStyles = havenMode ? {
    background: `
      linear-gradient(to bottom, #0a0e27 0%, #1a1f3a 25%, #2d1b3d 50%, #1a1f3a 75%, #0a0e27 100%),
      radial-gradient(2px 2px at 20% 30%, white, transparent),
      radial-gradient(2px 2px at 60% 70%, white, transparent),
      radial-gradient(1px 1px at 50% 50%, white, transparent),
      radial-gradient(1px 1px at 80% 10%, white, transparent),
      radial-gradient(2px 2px at 90% 40%, white, transparent),
      radial-gradient(1px 1px at 33% 60%, white, transparent),
      radial-gradient(1px 1px at 70% 80%, white, transparent),
      radial-gradient(2px 2px at 40% 20%, white, transparent),
      radial-gradient(1px 1px at 10% 50%, white, transparent),
      radial-gradient(1px 1px at 85% 60%, white, transparent),
      radial-gradient(2px 2px at 25% 80%, white, transparent),
      radial-gradient(1px 1px at 55% 10%, white, transparent),
      radial-gradient(1px 1px at 15% 70%, white, transparent),
      radial-gradient(2px 2px at 75% 30%, white, transparent),
      radial-gradient(1px 1px at 45% 90%, white, transparent),
      radial-gradient(1px 1px at 95% 20%, white, transparent),
      radial-gradient(2px 2px at 30% 40%, white, transparent),
      radial-gradient(1px 1px at 65% 50%, white, transparent),
      radial-gradient(1px 1px at 5% 30%, white, transparent)
    `,
    backgroundSize: '100% 100%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%',
    backgroundRepeat: 'no-repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat, repeat',
    position: 'relative' as const
  } : {}

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <aside className={`bg-white border-r border-gray-200 ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ${className || ''}`}>
        <div className="h-full flex flex-col">
          {/* Skeleton placeholder */}
          <div className="p-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </aside>
    )
  }

  return (
    <Tooltip.Provider>
      <aside 
        className={`${havenMode ? 'border-r border-gray-600' : 'bg-white border-r border-gray-200'} ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ${className || ''}`}
        style={havenModeStyles}
      >
        <div className={`h-full flex flex-col ${havenMode ? 'text-white' : ''}`}>
          {/* Header with logo/title - matches top bar height */}
          <div className={`py-4 flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${havenMode ? 'border-b border-gray-700' : ''}`}>
            <Link 
              href="/dashboard"
              className={`flex items-center gap-3 font-semibold ${havenMode ? 'text-white hover:text-blue-400' : 'text-gray-900 hover:text-blue-600'} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded group`}
            >
              <div className="size-12 rounded-lg flex items-center justify-center overflow-hidden -ml-px">
                <Image
                  src="/assets/Haven_House_App_Icon_Compressed.jpg"
                  alt="Haven"
                  width={48}
                  height={48}
                  className="object-contain transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              {!isCollapsed && (
                <span className="text-xl">Haven</span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav 
            className="flex-1 p-4 space-y-2" 
            aria-label="Primary navigation"
          >
            {NAVIGATION_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                collapsed={isCollapsed}
                exactMatch={'exactMatch' in item ? item.exactMatch : false}
                tourId={'tourId' in item ? item.tourId : undefined}
                havenMode={havenMode}
              />
            ))}
          </nav>

          {/* Footer with user profile and collapse button */}
          <div className={`p-4 border-t ${havenMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
            {/* User Profile Icon */}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
              <UserProfileIcon />
            </div>
            
            {/* Version Info (only when expanded) */}
            {!isCollapsed && (
              <div className={`px-2 py-1.5 rounded-md border ${havenMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xs font-medium ${havenMode ? 'text-white' : 'text-gray-500'}`}>Version</div>
                <div className={`text-xs font-mono ${havenMode ? 'text-white' : 'text-gray-700'}`}>
                  {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}
                </div>
              </div>
            )}
            
            {/* Collapse Button */}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
              <Button
                type="button"
                onClick={toggleCollapsed}
                className={`p-2 ${havenMode ? 'text-white hover:text-white hover:bg-gray-800/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  isCollapsed ? 'w-8 h-8' : ''
                }`}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft 
                  className={`size-4 transition-transform ${havenMode ? 'text-white' : ''} ${
                    isCollapsed ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}