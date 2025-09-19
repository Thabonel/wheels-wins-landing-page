#!/usr/bin/env node

/**
 * Quick validation script for Day 5 Integration Testing Suite
 * Tests the IntegrationTestSuite class functionality
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Day 5 Integration Testing Suite Validation');
console.log('============================================');

// Test 1: Verify integration testing file exists
const integrationTestingPath = join(__dirname, '../src/utils/integrationTesting.ts');
try {
  const content = readFileSync(integrationTestingPath, 'utf8');
  console.log('✅ IntegrationTestSuite file exists');

  // Check for key components
  const checks = [
    { name: 'IntegrationTestSuite class', pattern: /export class IntegrationTestSuite/ },
    { name: 'testUserRegistrationFlow method', pattern: /async testUserRegistrationFlow/ },
    { name: 'testFinancialFeaturesIntegration method', pattern: /async testFinancialFeaturesIntegration/ },
    { name: 'testPAMTripPlanningIntegration method', pattern: /async testPAMTripPlanningIntegration/ },
    { name: 'testDataPersistence method', pattern: /async testDataPersistence/ },
    { name: 'runAllIntegrationTests method', pattern: /async runAllIntegrationTests/ },
    { name: 'IntegrationTestResult interface', pattern: /export interface IntegrationTestResult/ },
    { name: 'IntegrationTestStep interface', pattern: /export interface IntegrationTestStep/ },
  ];

  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name} found`);
    } else {
      console.log(`❌ ${check.name} missing`);
    }
  });

} catch (error) {
  console.log('❌ IntegrationTestSuite file not found or not readable');
  console.error(error.message);
}

// Test 2: Verify dashboard component exists
const dashboardPath = join(__dirname, '../src/components/admin/IntegrationTestingDashboard.tsx');
try {
  const content = readFileSync(dashboardPath, 'utf8');
  console.log('✅ IntegrationTestingDashboard component exists');

  // Check for key components
  const dashboardChecks = [
    { name: 'React component', pattern: /const IntegrationTestingDashboard/ },
    { name: 'integrationTestSuite import', pattern: /import.*integrationTestSuite.*from.*integrationTesting/ },
    { name: 'runAllTests function', pattern: /const runAllTests/ },
    { name: 'runSingleTest function', pattern: /const runSingleTest/ },
    { name: 'exportResults function', pattern: /const exportResults/ },
  ];

  dashboardChecks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ Dashboard ${check.name} found`);
    } else {
      console.log(`❌ Dashboard ${check.name} missing`);
    }
  });

} catch (error) {
  console.log('❌ IntegrationTestingDashboard component not found');
  console.error(error.message);
}

// Test 3: Verify admin integration
const adminSidebarPath = join(__dirname, '../src/components/admin/AdminSidebar.tsx');
const adminContentPath = join(__dirname, '../src/components/admin/AdminContent.tsx');

try {
  const sidebarContent = readFileSync(adminSidebarPath, 'utf8');
  if (sidebarContent.includes("'Integration Testing'")) {
    console.log('✅ Integration Testing added to AdminSidebar');
  } else {
    console.log('❌ Integration Testing not found in AdminSidebar');
  }
} catch (error) {
  console.log('❌ AdminSidebar not readable');
}

try {
  const contentContent = readFileSync(adminContentPath, 'utf8');
  if (contentContent.includes('IntegrationTestingDashboard') &&
      contentContent.includes("case 'Integration Testing'")) {
    console.log('✅ IntegrationTestingDashboard integrated in AdminContent');
  } else {
    console.log('❌ IntegrationTestingDashboard not properly integrated');
  }
} catch (error) {
  console.log('❌ AdminContent not readable');
}

console.log('\n🎯 Integration Testing Suite Validation Complete');
console.log('Next steps:');
console.log('1. Navigate to admin panel at /admin');
console.log('2. Click "Integration Testing" in sidebar');
console.log('3. Run individual tests or "Run All Tests"');
console.log('4. Validate complete user registration to dashboard flow');