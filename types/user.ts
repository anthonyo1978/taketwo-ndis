/**
 * User Management Types
 * For Haven's user management system
 */

export type UserRole = 'admin' | 'staff' | 'manager'

export type UserStatus = 'invited' | 'active' | 'inactive'

export interface User {
  id: string
  authUserId?: string // Links to auth.users when password is set
  firstName: string
  lastName: string
  email: string
  phone?: string
  jobTitle?: string
  role: UserRole
  status: UserStatus
  invitedAt: Date
  activatedAt?: Date
  lastLoginAt?: Date
  createdAt: Date
  createdBy?: string
  updatedAt: Date
  updatedBy?: string
}

export interface UserInvite {
  id: string
  userId: string
  token: string
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
}

export interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  jobTitle?: string
  role: UserRole
  sendWelcomeEmail?: boolean
}

export interface UpdateUserInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  jobTitle?: string
  role?: UserRole
  status?: UserStatus
}

export interface SetPasswordInput {
  token: string
  password: string
  confirmPassword: string
}

