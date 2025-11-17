"use client"

import { useState } from 'react'
import { CheckCircle2, Circle, Trash2 } from 'lucide-react'
import { Todo } from './mockTodos'
import { useTodos } from 'lib/contexts/TodoContext'

interface TodoItemProps {
  todo: Todo
}

export function TodoItem({ todo }: TodoItemProps) {
  const { updateTodoStatus, deleteTodo } = useTodos()

  const handleToggleDone = () => {
    const newStatus = todo.status === 'done' ? 'todo' : 'done'
    updateTodoStatus(todo.id, newStatus)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this todo?')) {
      deleteTodo(todo.id)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  const isDone = todo.status === 'done'

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        isDone
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon - Clickable to toggle */}
        <button
          onClick={handleToggleDone}
          className="flex-shrink-0 mt-0.5 p-0.5 hover:bg-gray-100 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          title={isDone ? 'Mark as todo' : 'Mark as done'}
        >
          {isDone ? (
            <CheckCircle2 className="size-5 text-green-500" />
          ) : (
            <Circle className="size-5 text-gray-400 hover:text-green-500" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-semibold ${
                isDone
                  ? 'text-gray-500 line-through'
                  : 'text-gray-900'
              }`}
            >
              {todo.title}
            </h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Priority badge */}
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  todo.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : todo.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {todo.priority}
              </span>
            </div>
          </div>

          {todo.description && (
            <p
              className={`text-xs mt-1 ${
                isDone ? 'text-gray-400 line-through' : 'text-gray-600'
              }`}
            >
              {todo.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            {todo.dueDate && (
              <span className="text-xs text-gray-500">
                Due: {formatDate(todo.dueDate)}
              </span>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete todo"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
