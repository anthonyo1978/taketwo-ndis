"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface SessionUser {
  id: string
  authId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  jobTitle?: string
  role: string
  initials: string
}

interface SessionContextType {
  user: SessionUser | null
  isLoading: boolean
  error: string | null
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchSession = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/session')
      const result = await response.json() as { 
        success: boolean
        user?: SessionUser
        error?: string 
      }

      if (result.success && result.user) {
        setUser(result.user)
      } else {
        setUser(null)
        setError(result.error || 'Failed to load session')
        
        // If not authenticated, redirect to login
        if (response.status === 401) {
          router.push('/login')
        }
      }
    } catch (err) {
      console.error('Session fetch error:', err)
      setError('Network error')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
      // Force logout even on error
      setUser(null)
      router.push('/login')
    }
  }

  const refreshSession = async () => {
    await fetchSession()
  }

  // Fetch session on mount
  useEffect(() => {
    fetchSession()
  }, [])

  return (
    <SessionContext.Provider 
      value={{ 
        user, 
        isLoading, 
        error, 
        logout, 
        refreshSession 
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

