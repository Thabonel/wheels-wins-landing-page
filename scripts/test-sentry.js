#!/usr/bin/env node

/**
 * Simple script to test Sentry configuration
 * This verifies that the DSN is configured correctly
 */

import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Sentry Configuration...\n');

// Check if DSN is configured
const dsn = process.env.VITE_SENTRY_DSN;
if (!dsn) {
  console.error('❌ VITE_SENTRY_DSN not found in environment variables');
  process.exit(1);
}

console.log('✅ Sentry DSN found:', `${dsn.substring(0, 30)  }...`);

// Initialize Sentry
Sentry.init({
  dsn,
  environment: process.env.VITE_SENTRY_ENVIRONMENT || 'development',
  debug: true, // Enable debug mode for testing
});

console.log('✅ Sentry initialized successfully');

// Send a test message
console.log('📤 Sending test message to Sentry...');
Sentry.captureMessage('Test message from Wheels and Wins setup script', 'info');

// Send a test error
console.log('📤 Sending test error to Sentry...');
try {
  throw new Error('Test error from setup script - Sentry is working!');
} catch (error) {
  Sentry.captureException(error);
}

// Wait for events to be sent
console.log('⏳ Waiting for events to be sent...');
setTimeout(() => {
  console.log('\n🎉 Sentry test completed!');
  console.log('📊 Check your Sentry dashboard at: https://sentry.io/organizations/wheels-and-wins/');
  console.log('💡 You should see 1 message and 1 error in the Issues section');
  process.exit(0);
}, 3000);