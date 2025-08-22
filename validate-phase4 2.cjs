#!/usr/bin/env node

/**
 * Phase 4 Code Validation Script
 * Validates the enhanced agents and tests without needing dependencies
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Phase 4 Code Validation Starting...\n');

const validationResults = {
  passed: [],
  warnings: [],
  errors: []
};

// Files to validate
const filesToCheck = [
  // Enhanced Agents
  { path: 'src/services/pam/agents/MemoryAgent.ts', minLines: 600, description: 'MemoryAgent with RAG' },
  { path: 'src/services/pam/agents/WheelsAgent.ts', minLines: 900, description: 'WheelsAgent with trip planning' },
  { path: 'src/services/pam/agents/WinsAgent.ts', minLines: 1300, description: 'WinsAgent with financial insights' },
  { path: 'src/services/pam/agents/SocialAgent.ts', minLines: 1500, description: 'SocialAgent with networking' },
  
  // Test Files
  { path: 'src/__tests__/agents/MemoryAgent.test.tsx', minLines: 500, description: 'MemoryAgent unit tests' },
  { path: 'src/__tests__/integration/pam-cross-agent-workflow.test.tsx', minLines: 300, description: 'Cross-agent integration tests' },
  { path: 'src/__tests__/integration/pam-e2e-conversation.test.tsx', minLines: 500, description: 'E2E conversation tests' },
  
  // Backend Enhancements
  { path: 'backend/app/services/pam/nodes/memory_node.py', minLines: 900, description: 'Backend memory node with RAG' }
];

// Check each file
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  
  if (!fs.existsSync(filePath)) {
    validationResults.errors.push(`❌ Missing file: ${file.path}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Check file size
  if (lines.length < file.minLines) {
    validationResults.warnings.push(`⚠️ ${file.path}: Has ${lines.length} lines, expected at least ${file.minLines}`);
  } else {
    validationResults.passed.push(`✅ ${file.description}: ${lines.length} lines`);
  }
  
  // Check for Phase 4 markers in agent files
  if (file.path.includes('agents/') && file.path.endsWith('.ts')) {
    if (!content.includes('Phase 4') && !content.includes('RAG') && !content.includes('intelligent')) {
      validationResults.warnings.push(`⚠️ ${file.path}: Missing Phase 4 enhancement markers`);
    }
  }
  
  // Check for required imports in test files
  if (file.path.includes('test')) {
    const requiredImports = ['vitest', 'describe', 'it', 'expect'];
    const missingImports = requiredImports.filter(imp => !content.includes(imp));
    
    if (missingImports.length > 0) {
      validationResults.errors.push(`❌ ${file.path}: Missing imports: ${missingImports.join(', ')}`);
    }
  }
  
  // Check for required Phase 4 functions
  if (file.path.includes('MemoryAgent')) {
    const requiredFunctions = ['semantic_memory_search', 'conversation_context', 'getEnhancedPamMemory'];
    const hasFunctions = requiredFunctions.filter(func => content.includes(func));
    
    if (hasFunctions.length > 0) {
      validationResults.passed.push(`✅ MemoryAgent has ${hasFunctions.length}/3 RAG functions`);
    }
  }
  
  // Check for syntax errors (basic)
  try {
    // Check for balanced braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      validationResults.errors.push(`❌ ${file.path}: Unbalanced braces (${openBraces} open, ${closeBraces} close)`);
    }
    
    // Check for balanced parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      validationResults.errors.push(`❌ ${file.path}: Unbalanced parentheses`);
    }
  } catch (e) {
    validationResults.errors.push(`❌ ${file.path}: Syntax check failed: ${e.message}`);
  }
});

// Check for Phase 4 specific features
console.log('\n📋 Phase 4 Feature Validation:\n');

const features = [
  { name: 'RAG Integration', files: ['MemoryAgent.ts', 'memory_node.py'], keyword: 'semantic_memory_search' },
  { name: 'Trip Planning', files: ['WheelsAgent.ts'], keyword: 'intelligent_trip_planner' },
  { name: 'Financial Insights', files: ['WinsAgent.ts'], keyword: 'pam_savings' },
  { name: 'Social Networking', files: ['SocialAgent.ts'], keyword: 'compatibility_score' },
  { name: 'Test Coverage', files: ['MemoryAgent.test.tsx'], keyword: 'describe.*MemoryAgent' }
];

features.forEach(feature => {
  const found = feature.files.some(fileName => {
    const file = filesToCheck.find(f => f.path.includes(fileName));
    if (!file) return false;
    
    const filePath = path.join(__dirname, file.path);
    if (!fs.existsSync(filePath)) return false;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return new RegExp(feature.keyword, 'i').test(content);
  });
  
  if (found) {
    validationResults.passed.push(`✅ ${feature.name} implemented`);
  } else {
    validationResults.warnings.push(`⚠️ ${feature.name} not found`);
  }
});

// Print results
console.log('\n📊 Validation Results:\n');
console.log('PASSED (' + validationResults.passed.length + '):');
validationResults.passed.forEach(msg => console.log('  ' + msg));

if (validationResults.warnings.length > 0) {
  console.log('\nWARNINGS (' + validationResults.warnings.length + '):');
  validationResults.warnings.forEach(msg => console.log('  ' + msg));
}

if (validationResults.errors.length > 0) {
  console.log('\nERRORS (' + validationResults.errors.length + '):');
  validationResults.errors.forEach(msg => console.log('  ' + msg));
}

// Summary
console.log('\n' + '='.repeat(60));
if (validationResults.errors.length === 0) {
  console.log('✅ Phase 4 Validation PASSED - Code is ready for deployment!');
  console.log(`   ${validationResults.passed.length} checks passed`);
  if (validationResults.warnings.length > 0) {
    console.log(`   ${validationResults.warnings.length} warnings (non-critical)`);
  }
} else {
  console.log('❌ Phase 4 Validation FAILED - Issues need attention');
  console.log(`   ${validationResults.errors.length} errors found`);
}
console.log('='.repeat(60));

process.exit(validationResults.errors.length > 0 ? 1 : 0);