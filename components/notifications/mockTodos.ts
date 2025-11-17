// Mock todo data for initial front-end testing

export type TodoPriority = 'high' | 'medium' | 'low'
export type TodoStatus = 'todo' | 'done'

export interface Todo {
  id: string
  title: string
  description?: string
  priority: TodoPriority
  dueDate: Date | null // Only show today's todos in the list
  status: TodoStatus
  createdAt: Date
  notificationId?: string // Link to notification if created from one
}

// Generate mock todos (only today's items)
export function generateMockTodos(): Todo[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return [
    {
      id: '1',
      title: 'Review automation logs from last night',
      description: 'Check if all transactions were generated correctly',
      priority: 'high',
      dueDate: today,
      status: 'todo',
      createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      notificationId: '1'
    },
    {
      id: '2',
      title: 'Follow up with Petra Camino about contract',
      description: 'Contract renewal discussion',
      priority: 'medium',
      dueDate: today,
      status: 'todo',
      createdAt: new Date(today.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      id: '3',
      title: 'Update resident contact information',
      description: 'John Smith - new phone number',
      priority: 'low',
      dueDate: today,
      status: 'todo',
      createdAt: new Date(today.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      id: '4',
      title: 'Submit weekly claim report',
      description: 'NDIA claim submission for week ending Nov 17',
      priority: 'high',
      dueDate: today,
      status: 'done',
      createdAt: new Date(today.getTime() - 8 * 60 * 60 * 1000), // 8 hours ago
    },
    {
      id: '5',
      title: 'Review house maintenance requests',
      description: 'Check pending maintenance items',
      priority: 'medium',
      dueDate: today,
      status: 'done',
      createdAt: new Date(today.getTime() - 10 * 60 * 60 * 1000), // 10 hours ago
    }
  ]
}

