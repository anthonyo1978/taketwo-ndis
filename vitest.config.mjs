import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './'),
      '@/lib': path.resolve(process.cwd(), './lib'),
      '@/components': path.resolve(process.cwd(), './components'),
      '@/types': path.resolve(process.cwd(), './types'),
      'components': path.resolve(process.cwd(), './components'),
      'lib': path.resolve(process.cwd(), './lib'),
      'types': path.resolve(process.cwd(), './types')
    }
  }
})
