"use client"

import * as Tooltip from "@radix-ui/react-tooltip"
import { 
  ChevronLeft,
  CreditCard, 
  FileCheck,
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
  },
  {
    label: "Houses",
    href: "/houses",
    icon: Home,
  },
  {
    label: "Residents",
    href: "/residents",
    icon: Users,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: CreditCard,
  },
  {
    label: "Claims",
    href: "/claims",
    icon: FileCheck,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
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

  // Load collapsed state from localStorage on client-side
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(JSON.parse(stored) as boolean)
    } else {
      // If no stored preference, default to collapsed
      setIsCollapsed(true)
    }
  }, [])

  // Save collapsed state to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed))
    }
  }, [isCollapsed, mounted])

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed)
  }

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
      <aside className={`bg-white border-r border-gray-200 ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ${className || ''}`}>
        <div className="h-full flex flex-col">
          {/* Header with logo/title - matches top bar height */}
          <div className={`py-4 flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}>
            <Link 
              href="/dashboard"
              className="flex items-center gap-3 font-semibold text-gray-900 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded group"
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
              />
            ))}
          </nav>

          {/* Footer with user profile and collapse button */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            {/* User Profile Icon */}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
              <UserProfileIcon />
            </div>
            
            {/* Collapse Button */}
            <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
              <Button
                type="button"
                onClick={toggleCollapsed}
                className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  isCollapsed ? 'w-8 h-8' : ''
                }`}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft 
                  className={`size-4 transition-transform ${
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