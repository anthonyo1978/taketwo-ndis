import { twMerge } from "tailwind-merge"

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  fullScreen?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
  xl: 'h-16 w-16 border-4'
}

export function LoadingSpinner({ 
  size = 'md', 
  message, 
  fullScreen = false,
  className 
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={twMerge('flex flex-col items-center justify-center', className)}>
      <div 
        className={twMerge(
          'animate-spin rounded-full border-gray-200 border-t-blue-600',
          sizeClasses[size]
        )}
      />
      {message && (
        <p className="mt-4 text-gray-600 text-sm font-medium">{message}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

// Inline variant for use within components
export function InlineSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div 
      className={twMerge(
        'inline-block animate-spin rounded-full border-gray-200 border-t-blue-600',
        sizeClasses[size]
      )}
    />
  )
}

// Table loading skeleton
export function TableLoadingSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" message="Loading data..." />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex space-x-4 animate-pulse">
            {Array.from({ length: columns }).map((_, j) => (
              <div 
                key={j} 
                className="h-10 bg-gray-200 rounded flex-1"
                style={{ animationDelay: `${(i * columns + j) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Card loading skeleton
export function CardLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

