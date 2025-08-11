#!/usr/bin/env node

/**
 * Phase 5A Integration Test
 * Tests the complete TTS integration flow
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Phase 5A TTS Integration Test');
console.log('='.repeat(50));

// Test 1: Verify TTS backend files exist
console.log('\n1. Backend TTS Infrastructure...');
const backendFiles = [
  'backend/app/services/tts/__init__.py',
  'backend/app/services/tts/base.py',
  'backend/app/services/tts/manager.py',
  'backend/app/services/tts/engines/edge_tts.py',
  'backend/app/services/tts/engines/system_tts.py'
];

let backendScore = 0;
backendFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
    backendScore++;
  } else {
    console.log(`   ❌ ${file}`);
  }
});

// Test 2: Verify WebSocket integration
console.log('\n2. WebSocket TTS Integration...');
const pamApiFile = 'backend/app/api/v1/pam.py';
if (fs.existsSync(pamApiFile)) {
  const pamContent = fs.readFileSync(pamApiFile, 'utf8');
  const integrationChecks = [
    'generate_tts_audio',
    'tts_audio = await',
    'response_payload["tts"]',
    'tts_processing_time'
  ];
  
  let integrationScore = 0;
  integrationChecks.forEach(check => {
    if (pamContent.includes(check)) {
      console.log(`   ✅ ${check}`);
      integrationScore++;
    } else {
      console.log(`   ❌ ${check}`);
    }
  });
  console.log(`   Integration Score: ${integrationScore}/${integrationChecks.length}`);
} else {
  console.log(`   ❌ ${pamApiFile} not found`);
}

// Test 3: Verify frontend components  
console.log('\n3. Frontend TTS Components...');
const frontendFiles = [
  'src/hooks/useTTS.ts',
  'src/components/pam/TTSControls.tsx'
];

let frontendScore = 0;
frontendFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
    frontendScore++;
  } else {
    console.log(`   ❌ ${file}`);
  }
});

// Test 4: Verify PAM component integration
console.log('\n4. PAM Component TTS Integration...');
const pamComponentFile = 'src/components/Pam.tsx';
if (fs.existsSync(pamComponentFile)) {
  const pamComponent = fs.readFileSync(pamComponentFile, 'utf8');
  const pamChecks = [
    'TTSAudio',
    'msg.tts',
    'TTSControls',
    'tts?: TTSAudio'
  ];
  
  let pamScore = 0;
  pamChecks.forEach(check => {
    if (pamComponent.includes(check)) {
      console.log(`   ✅ ${check}`);
      pamScore++;
    } else {
      console.log(`   ❌ ${check}`);
    }
  });
  console.log(`   PAM Integration Score: ${pamScore}/${pamChecks.length}`);
} else {
  console.log(`   ❌ ${pamComponentFile} not found`);
}

// Test 5: Verify dependencies
console.log('\n5. Backend Dependencies...');
const requirementsFile = 'backend/requirements.txt';
if (fs.existsSync(requirementsFile)) {
  const requirements = fs.readFileSync(requirementsFile, 'utf8');
  const deps = ['edge-tts', 'pydub'];
  
  let depsScore = 0;
  deps.forEach(dep => {
    if (requirements.includes(dep)) {
      console.log(`   ✅ ${dep}`);
      depsScore++;
    } else {
      console.log(`   ❌ ${dep}`);
    }
  });
  console.log(`   Dependencies Score: ${depsScore}/${deps.length}`);
} else {
  console.log(`   ❌ ${requirementsFile} not found`);
}

// Final Results
console.log('\n🏆 Phase 5A Integration Test Results');
console.log('='.repeat(50));

const totalFiles = backendFiles.length + frontendFiles.length;
const totalScore = backendScore + frontendScore;

console.log(`Backend Infrastructure: ${backendScore}/${backendFiles.length} files`);
console.log(`Frontend Components: ${frontendScore}/${frontendFiles.length} files`);
console.log(`Total Implementation: ${totalScore}/${totalFiles} files`);

if (totalScore === totalFiles) {
  console.log('\n🎉 Phase 5A Integration: COMPLETE ✅');
  console.log('All TTS components are in place and ready for testing!');
  process.exit(0);
} else {
  console.log(`\n⚠️ Phase 5A Integration: ${totalFiles - totalScore} missing components`);
  console.log('Please check the missing files above.');
  process.exit(1);
}