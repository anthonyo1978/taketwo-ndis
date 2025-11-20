"use client"

import { useState, useMemo } from 'react'
import { Clipboard, Plus } from 'lucide-react'
import { TodoItem } from './TodoItem'
import { useTodos } from 'lib/contexts/TodoContext'
import { TodoPriority } from './mockTodos'

type TodoView = 'today' | 'next7days' | 'all'

export function TodoList() {
  const { todos, todayTodos, addTodo } = useTodos()
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeView, setActiveView] = useState<TodoView>('today')
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newTodoDescription, setNewTodoDescription] = useState('')
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('medium')
  const [newTodoDueDate, setNewTodoDueDate] = useState(() => {
    // Default to today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.toISOString().split('T')[0] // Format as YYYY-MM-DD for input
  })

  // Get today's date in YYYY-MM-DD format for min attribute
  const todayDateString = (() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.toISOString().split('T')[0]
  })()

  // Filter todos based on active view
  const filteredTodos = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (activeView) {
      case 'today':
        return todos.filter(todo => {
          if (!todo.dueDate) return false
          const dueDate = new Date(todo.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate.getTime() === today.getTime()
        })

      case 'next7days':
        const sevenDaysLater = new Date(today)
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
        return todos.filter(todo => {
          if (!todo.dueDate) return false
          const dueDate = new Date(todo.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate >= today && dueDate <= sevenDaysLater
        })

      case 'all':
        return todos

      default:
        return todayTodos
    }
  }, [todos, activeView, todayTodos])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoTitle.trim()) return

    // Parse the date from input
    const dueDate = newTodoDueDate ? new Date(newTodoDueDate) : null
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0)
    }

    addTodo({
      title: newTodoTitle.trim(),
      description: newTodoDescription.trim() || undefined,
      priority: newTodoPriority,
      dueDate: dueDate,
      status: 'todo'
    })

    // Reset form
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setNewTodoTitle('')
    setNewTodoDescription('')
    setNewTodoPriority('medium')
    setNewTodoDueDate(today.toISOString().split('T')[0])
    setShowAddForm(false)
  }

  // Group todos by status (only todo and done now)
  const todosByStatus = {
    todo: filteredTodos.filter(t => t.status === 'todo'),
    done: filteredTodos.filter(t => t.status === 'done')
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header with Tabs */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clipboard className="size-5 text-gray-700" />
            <h3 className="text-sm font-semibold text-gray-900">To-dos</h3>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Add new todo"
          >
            <Plus className="size-4" />
          </button>
        </div>
        
        {/* View Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('today')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'today'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveView('next7days')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'next7days'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Next 7 Days
          </button>
          <button
            onClick={() => setActiveView('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Add Todo Form */}
      {showAddForm && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <input
                type="text"
                placeholder="Todo title..."
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            <div>
              <textarea
                placeholder="Description (optional)..."
                value={newTodoDescription}
                onChange={(e) => setNewTodoDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as TodoPriority)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <input
                type="date"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={todayDateString} // Prevent past dates - only today or future
                required
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  setNewTodoTitle('')
                  setNewTodoDescription('')
                  setNewTodoDueDate(today.toISOString().split('T')[0])
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTodoTitle.trim() || !newTodoDueDate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              >
                Add Todo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* To Do */}
        {todosByStatus.todo.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              To Do ({todosByStatus.todo.length})
            </h4>
            <div className="space-y-2">
              {todosByStatus.todo.map(todo => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {todosByStatus.done.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Done ({todosByStatus.done.length})
            </h4>
            <div className="space-y-2">
              {todosByStatus.done.map(todo => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredTodos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clipboard className="size-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">
              {activeView === 'today' 
                ? 'No todos for today' 
                : activeView === 'next7days'
                ? 'No todos in the next 7 days'
                : 'No todos'}
            </p>
            <p className="text-xs mt-1">Click the + button to add one</p>
          </div>
        )}
      </div>
    </div>
  )
}
