// Mock notification data for initial front-end testing

export interface Notification {
  id: string
  type: 'n8n' | 'system' | 'user'
  category: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  icon?: string
}

// Generate mock notifications
export function generateMockNotifications(): Notification[] {
  const now = new Date()
  
  return [
    {
      id: '1',
      type: 'n8n',
      category: 'automation',
      title: 'Automation Completed',
      message: 'Daily billing automation completed successfully. 15 transactions generated.',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
      read: false,
      actionUrl: '/transactions',
      icon: '✅'
    },
    {
      id: '2',
      type: 'system',
      category: 'transaction',
      title: 'Transaction Generated',
      message: 'New transaction created for Petra Camino - $150.00',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
      read: false,
      actionUrl: '/transactions',
      icon: '💳'
    },
    {
      id: '3',
      type: 'n8n',
      category: 'automation',
      title: 'Workflow Triggered',
      message: 'Weekly report workflow executed. Report sent to admin@example.com',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: true,
      actionUrl: '/settings/automation',
      icon: '📊'
    },
    {
      id: '4',
      type: 'system',
      category: 'claim',
      title: 'Claim Submitted',
      message: 'NDIA claim #12345 submitted successfully',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: true,
      actionUrl: '/claims',
      icon: '📄'
    },
    {
      id: '5',
      type: 'system',
      category: 'resident',
      title: 'Resident Status Changed',
      message: 'John Smith status updated from Prospect to Active',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      read: true,
      actionUrl: '/residents',
      icon: '👤'
    },
    {
      id: '6',
      type: 'n8n',
      category: 'automation',
      title: 'Automation Failed',
      message: 'Daily billing automation encountered an error. Check logs for details.',
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      read: false,
      actionUrl: '/settings/automation',
      icon: '⚠️'
    },
    {
      id: '7',
      type: 'user',
      category: 'invite',
      title: 'User Invited',
      message: 'New user invitation sent to newuser@example.com',
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      read: true,
      actionUrl: '/settings/users',
      icon: '👥'
    }
  ]
}

