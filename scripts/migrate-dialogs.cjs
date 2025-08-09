#!/usr/bin/env node

/**
 * Dialog Migration Script
 * 
 * Automatically updates Dialog and AlertDialog imports to use animated versions
 * Usage: node scripts/migrate-dialogs.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// Import patterns to replace
const replacements = [
  {
    pattern: /from ['"]@\/components\/ui\/dialog['"];?/g,
    replacement: 'from "@/components/common/AnimatedDialog";',
    description: 'Dialog imports'
  },
  {
    pattern: /from ['"]@\/components\/ui\/alert-dialog['"];?/g,
    replacement: 'from "@/components/common/AnimatedAlertDialog";',
    description: 'AlertDialog imports'
  }
];

// Simple file discovery function
function findFiles(dir, extension = '.tsx') {
  const files = [];
  
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip ui components and node_modules
        if (!item.includes('ui') && !item.includes('node_modules') && !item.includes('.git')) {
          walk(fullPath);
        }
      } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
        // Skip our own animated components
        if (!fullPath.includes('Animated')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

const files = findFiles('./src');

let totalChanges = 0;
let filesChanged = 0;

console.log(`🔄 Dialog Migration Script ${DRY_RUN ? '(DRY RUN)' : ''}`);
console.log(`Found ${files.length} files to check\n`);

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileChanged = false;
    let changes = [];

    replacements.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        newContent = newContent.replace(pattern, replacement);
        fileChanged = true;
        changes.push(`  - ${description}: ${matches.length} replacement(s)`);
      }
    });

    if (fileChanged) {
      filesChanged++;
      console.log(`📝 ${filePath}`);
      changes.forEach(change => console.log(change));
      console.log('');

      if (!DRY_RUN) {
        fs.writeFileSync(filePath, newContent, 'utf8');
      }

      totalChanges += changes.length;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n📊 Migration Summary:`);
console.log(`- Files processed: ${files.length}`);
console.log(`- Files changed: ${filesChanged}`);
console.log(`- Total changes: ${totalChanges}`);

if (DRY_RUN) {
  console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.');
} else {
  console.log('\n✅ Migration completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Test the application to ensure all dialogs work correctly');
  console.log('2. Consider adding animated props (animated={true}) to headers/footers');
  console.log('3. Use DialogStaggeredContent for complex dialogs');
}

// Generate report of remaining files
const remainingFiles = files.filter(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('@/components/ui/dialog') || content.includes('@/components/ui/alert-dialog');
});

if (remainingFiles.length > 0 && !DRY_RUN) {
  console.log(`\n⚠️  Found ${remainingFiles.length} files that still need manual review:`);
  remainingFiles.forEach(file => console.log(`   ${file}`));
}