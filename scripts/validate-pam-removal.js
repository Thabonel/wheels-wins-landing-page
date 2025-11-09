#!/usr/bin/env node

/**
 * PAM Removal Validation Script
 * Validates the progress of old PAM system removal and identifies remaining references
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

async function findFilesRecursively(dir, pattern) {
  const files = [];
  
  async function scan(currentDir) {
    const items = await readdir(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await scan(fullPath);
      } else if (stats.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return files;
}

async function searchInFile(filePath, patterns) {
  try {
    const content = await readFile(filePath, 'utf8');
    const results = [];
    
    patterns.forEach(pattern => {
      const matches = content.match(new RegExp(pattern.search, 'gi'));
      if (matches) {
        results.push({
          pattern: pattern.name,
          matches: matches.length,
          lines: content.split('\n')
            .map((line, index) => ({ line: line.trim(), number: index + 1 }))
            .filter(({ line }) => new RegExp(pattern.search, 'i').test(line))
            .slice(0, 3) // Limit to first 3 matches per file
        });
      }
    });
    
    return results;
  } catch (error) {
    return [];
  }
}

async function validatePamRemoval() {
  log(COLORS.BLUE, '🔍 PAM System Removal Validation\n');
  
  const searchPatterns = [
    { name: 'pamService imports', search: 'from.*pamService' },
    { name: 'PamContext imports', search: 'from.*PamContext' },
    { name: 'usePamWebSocket imports', search: 'from.*usePamWebSocket' },
    { name: 'PamAssistant imports', search: 'from.*PamAssistant' },
    { name: 'pamService usage', search: 'pamService\\.' },
    { name: 'PamContext usage', search: '<PamProvider|</PamProvider|usePamContext' },
    { name: 'usePamWebSocket usage', search: 'usePamWebSocket\\(' },
    { name: 'Old PAM components', search: '<PamAssistant|<Pam[^S]' }
  ];

  const results = {
    totalFiles: 0,
    filesWithIssues: 0,
    issues: [],
    commentedOut: 0,
    activeReferences: 0
  };

  log(COLORS.YELLOW, '📁 Scanning TypeScript and TSX files...\n');

  // Search in src directory
  const files = await findFilesRecursively('src', /\.(ts|tsx)$/);
  results.totalFiles = files.length;

  for (const filePath of files) {
    const fileResults = await searchInFile(filePath, searchPatterns);
    
    if (fileResults.length > 0) {
      results.filesWithIssues++;
      
      const fileIssues = {
        file: filePath,
        patterns: fileResults
      };
      
      results.issues.push(fileIssues);
      
      // Count commented out vs active references
      const content = await readFile(filePath, 'utf8');
      fileResults.forEach(result => {
        result.lines.forEach(({ line }) => {
          if (line.startsWith('//') || line.includes('// ')) {
            results.commentedOut++;
          } else {
            results.activeReferences++;
          }
        });
      });
    }
  }

  // Display results
  log(COLORS.BLUE, '📊 Validation Results:');
  console.log('');
  
  log(COLORS.YELLOW, `Total files scanned: ${results.totalFiles}`);
  log(COLORS.YELLOW, `Files with PAM references: ${results.filesWithIssues}`);
  log(COLORS.GREEN, `Commented out references: ${results.commentedOut}`);
  log(COLORS.RED, `Active references: ${results.activeReferences}`);
  
  console.log('');
  
  if (results.issues.length > 0) {
    log(COLORS.YELLOW, '🔍 Files with PAM references:');
    console.log('');
    
    results.issues.forEach(issue => {
      const fileName = issue.file.replace(process.cwd(), '');
      log(COLORS.BLUE, `📄 ${fileName}`);
      
      issue.patterns.forEach(pattern => {
        const status = pattern.lines.some(l => !l.line.startsWith('//') && !l.line.includes('// ')) 
          ? `${COLORS.RED  }❌ ACTIVE` 
          : `${COLORS.GREEN  }✅ COMMENTED`;
          
        log(COLORS.YELLOW, `   ${pattern.pattern}: ${pattern.matches} matches ${status}${COLORS.RESET}`);
        
        pattern.lines.forEach(({ line, number }) => {
          const prefix = line.startsWith('//') || line.includes('// ') ? '✅' : '❌';
          console.log(`      ${prefix} Line ${number}: ${line.substring(0, 80)}...`);
        });
      });
      console.log('');
    });
  }

  // Check specific old files that should be deleted
  console.log('');
  log(COLORS.BLUE, '🗂️  Checking files scheduled for deletion:');
  console.log('');
  
  const filesToDelete = [
    'src/services/pamService.ts',
    'src/services/pamApiService.ts',
    'src/services/pamConnectionService.ts',
    'src/components/pam/Pam.tsx',
    'src/components/pam/PamAssistant.tsx',
    'src/components/Pam.tsx',
    'src/context/PamContext.tsx',
    'src/hooks/pam/usePamWebSocket.ts',
    'src/hooks/pam/usePamWebSocketConnection.ts'
  ];

  let filesToDeleteExist = 0;
  for (const filePath of filesToDelete) {
    try {
      await stat(filePath);
      log(COLORS.RED, `❌ ${filePath} - Still exists (ready for deletion)`);
      filesToDeleteExist++;
    } catch {
      log(COLORS.GREEN, `✅ ${filePath} - Already deleted`);
    }
  }

  console.log('');
  
  // Overall assessment
  const removalScore = Math.max(0, 100 - (results.activeReferences * 10) - (filesToDeleteExist * 5));
  const scoreColor = removalScore >= 90 ? COLORS.GREEN : removalScore >= 70 ? COLORS.YELLOW : COLORS.RED;
  
  log(scoreColor, `🏆 PAM Removal Progress: ${removalScore}%`);
  
  console.log('');
  log(COLORS.BLUE, '📋 Next Steps:');
  
  if (results.activeReferences > 0) {
    log(COLORS.YELLOW, `• Comment out ${results.activeReferences} active PAM references`);
  }
  
  if (filesToDeleteExist > 0) {
    log(COLORS.YELLOW, `• Delete ${filesToDeleteExist} old PAM files`);
  }
  
  if (results.activeReferences === 0 && filesToDeleteExist === 0) {
    log(COLORS.GREEN, '• PAM removal is complete! 🎉');
  }

  console.log('');
  log(COLORS.BLUE, '🚀 Integration Status:');
  
  // Check if SimplePAM is being used
  try {
    const appContent = await readFile('src/App.tsx', 'utf8');
    const hasSimplePam = appContent.includes('SimplePamTest') || appContent.includes('SimplePAM');
    
    if (hasSimplePam) {
      log(COLORS.GREEN, '✅ SimplePAM integration detected');
    } else {
      log(COLORS.YELLOW, '⚠️  SimplePAM integration not detected in App.tsx');
    }
  } catch {
    log(COLORS.RED, '❌ Could not check App.tsx for SimplePAM integration');
  }

  return removalScore >= 90;
}

// Run validation
validatePamRemoval()
  .then(success => {
    console.log('');
    log(COLORS.BLUE, success ? '🎉 PAM removal validation passed!' : '⚠️  PAM removal needs more work');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(COLORS.RED, `❌ Validation failed: ${error.message}`);
    process.exit(1);
  });