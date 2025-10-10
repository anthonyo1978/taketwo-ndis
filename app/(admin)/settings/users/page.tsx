"use client"

import { useState, useEffect } from 'react'
import { Button } from 'components/Button/Button'
import { Input } from 'components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'components/ui/Dialog'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  job_title?: string
  role: string
  status: string
  invited_at: string
  activated_at?: string
  last_login_at?: string
  created_at: string
}

const userFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  role: z.enum(['admin', 'staff', 'manager']).default('staff'),
  sendWelcomeEmail: z.boolean().default(true)
})

type UserFormData = z.infer<typeof userFormSchema>

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema) as any,
    defaultValues: {
      role: 'staff' as const,
      sendWelcomeEmail: true
    }
  })

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const result = await response.json() as { success: boolean; data?: User[]; error?: string }

      if (result.success) {
        setUsers(result.data || [])
      } else {
        toast.error('Failed to load users')
      }
    } catch (error) {
      toast.error('Network error loading users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Create user
  const onSubmit = async (data: UserFormData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json() as { success: boolean; message?: string; error?: string }

      if (result.success) {
        toast.success(result.message || 'User created successfully')
        setShowAddModal(false)
        form.reset()
        fetchUsers()
      } else {
        toast.error(result.error || 'Failed to create user')
      }
    } catch (error) {
      toast.error('Network error')
    }
  }

  // Resend invite
  const handleResendInvite = async (userId: string, email: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/resend-invite`, {
        method: 'POST'
      })

      const result = await response.json() as { success: boolean; message?: string; error?: string }

      if (result.success) {
        toast.success(`Invitation resent to ${email}`)
      } else {
        toast.error(result.error || 'Failed to resend invitation')
      }
    } catch (error) {
      toast.error('Network error')
    }
  }

  // Deactivate user
  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${userName}? They will no longer be able to log in.`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      const result = await response.json() as { success: boolean; message?: string; error?: string }

      if (result.success) {
        toast.success(`${userName} has been deactivated`)
        fetchUsers()
      } else {
        toast.error(result.error || 'Failed to deactivate user')
      }
    } catch (error) {
      toast.error('Network error')
    }
  }

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const styles = {
      invited: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return styles[status as keyof typeof styles] || styles.invited
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Invite and manage users who can access Haven
          </p>
        </div>
        <Button
          intent="primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add User
        </Button>
      </div>

      {/* Users table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No users yet</h3>
          <p className="mt-2 text-sm text-gray-600">Get started by adding your first user</p>
          <Button
            intent="primary"
            onClick={() => setShowAddModal(true)}
            className="mt-4"
          >
            + Add First User
          </Button>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.phone && (
                        <div className="text-xs text-gray-400">{user.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.job_title || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(user.status)} capitalize`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.invited_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {user.status === 'invited' && (
                      <button
                        onClick={() => handleResendInvite(user.id, user.email)}
                        className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Resend Invite
                      </button>
                    )}
                    {user.status === 'active' && (
                      <button
                        onClick={() => handleDeactivate(user.id, `${user.first_name} ${user.last_name}`)}
                        className="text-sm text-red-600 hover:text-red-900 font-medium"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                {...form.register('firstName')}
                label="First Name *"
                placeholder="John"
                error={form.formState.errors.firstName?.message}
              />
              <Input
                {...form.register('lastName')}
                label="Last Name *"
                placeholder="Smith"
                error={form.formState.errors.lastName?.message}
              />
            </div>

            <Input
              {...form.register('email')}
              type="email"
              label="Email *"
              placeholder="john.smith@example.com"
              error={form.formState.errors.email?.message}
            />

            <Input
              {...form.register('phone')}
              type="tel"
              label="Phone"
              placeholder="+61 4XX XXX XXX"
              error={form.formState.errors.phone?.message}
            />

            <Input
              {...form.register('jobTitle')}
              label="Job Title"
              placeholder="Support Coordinator"
              error={form.formState.errors.jobTitle?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                {...form.register('role')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              {form.formState.errors.role && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.role.message}</p>
              )}
            </div>

            <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                {...form.register('sendWelcomeEmail')}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-900">
                  Send welcome email
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  User will receive an email with a link to set their password and access Haven
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                intent="secondary"
                onClick={() => {
                  setShowAddModal(false)
                  form.reset()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                intent="primary"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

