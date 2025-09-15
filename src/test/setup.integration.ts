import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Ensure required environment variables are set
beforeAll(() => {
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Integration tests may fail or use mock data');
  }

  // Set test-specific configurations
  process.env.NODE_ENV = 'test';
  
  // Ensure we don't accidentally hit production services
  if (process.env.VITE_SUPABASE_URL?.includes('supabase.co')) {
    console.log('Using production Supabase URL for integration tests');
    console.log('Ensure test data isolation is properly configured');
  }
});

afterAll(() => {
  // Cleanup global test state if needed
});

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  isCI: process.env.CI === 'true'
};