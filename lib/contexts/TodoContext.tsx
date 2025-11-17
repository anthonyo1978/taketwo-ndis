"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Todo, TodoStatus, TodoPriority, generateMockTodos } from 'components/notifications/mockTodos'

interface TodoContextType {
  todos: Todo[]
  todayTodos: Todo[]
  todayCount: number
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  updateTodoStatus: (id: string, status: TodoStatus) => void
  createTodoFromNotification: (notificationId: string, title: string, description?: string) => void
}

const TodoContext = createContext<TodoContextType | undefined>(undefined)

const STORAGE_KEY = 'haven-todos'

export function TodoProvider({ children }: { children: ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [mounted, setMounted] = useState(false)

  // Load todos from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Todo[]
        // Convert date strings back to Date objects
        const todosWithDates = parsed.map(todo => ({
          ...todo,
          dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
          createdAt: new Date(todo.createdAt)
        }))
        setTodos(todosWithDates)
      } else {
        // Initialize with mock data if no stored data
        setTodos(generateMockTodos())
      }
    } catch (error) {
      console.error('Error loading todos from localStorage:', error)
      setTodos(generateMockTodos())
    }
  }, [])

  // Save todos to localStorage whenever they change
  useEffect(() => {
    if (mounted && todos.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
      } catch (error) {
        console.error('Error saving todos to localStorage:', error)
      }
    }
  }, [todos, mounted])

  // Filter to only today's todos
  const todayTodos = todos.filter(todo => {
    if (!todo.dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(todo.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() === today.getTime()
  })

  // Count only open (todo) items for today
  const todayCount = todayTodos.filter(todo => 
    todo.status === 'todo'
  ).length

  const addTodo = (todoData: Omit<Todo, 'id' | 'createdAt'>) => {
    const newTodo: Todo = {
      ...todoData,
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    }
    setTodos(prev => [newTodo, ...prev])
  }

  const updateTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id
          ? { ...todo, ...updates }
          : todo
      )
    )
  }

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }

  const updateTodoStatus = (id: string, status: TodoStatus) => {
    updateTodo(id, { status })
  }

  const createTodoFromNotification = (
    notificationId: string,
    title: string,
    description?: string
  ) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    addTodo({
      title,
      description,
      priority: 'medium',
      dueDate: today,
      status: 'todo',
      notificationId
    })
  }

  return (
    <TodoContext.Provider
      value={{
        todos,
        todayTodos,
        todayCount,
        addTodo,
        updateTodo,
        deleteTodo,
        updateTodoStatus,
        createTodoFromNotification
      }}
    >
      {children}
    </TodoContext.Provider>
  )
}

export function useTodos() {
  const context = useContext(TodoContext)
  if (context === undefined) {
    throw new Error('useTodos must be used within a TodoProvider')
  }
  return context
}

