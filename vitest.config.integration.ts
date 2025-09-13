import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'pam-tools-integration',
    include: ['src/services/pam/tools/tools.integration.test.ts'],
    environment: 'node',
    setupFiles: ['./src/test/setup.integration.ts'],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 60000, // 60 seconds for setup/teardown
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage/integration',
      include: [
        'src/services/pam/tools/**/*.ts'
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/index.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Prevent test conflicts with database
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  define: {
    'import.meta.vitest': false
  }
});