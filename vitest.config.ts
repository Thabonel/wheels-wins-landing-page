import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000, // 10 seconds timeout per test
    hookTimeout: 10000, // 10 seconds timeout for hooks
    exclude: [
      '**/node_modules/**',
      '**/e2e/**', // Exclude E2E tests from unit test runs
      '**/dist/**',
      '**/build/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      // Target 80% coverage as per standards
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    globals: true,
    // Fail tests if coverage thresholds are not met
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false, // Allow multiple threads for better performance
        maxThreads: 4,
        minThreads: 1
      }
    },
    // Better error handling
    onConsoleLog(log, type) {
      if (type === 'stderr' && log.includes('useAuth must be used within an AuthProvider')) {
        return false; // Don't log expected test errors
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
