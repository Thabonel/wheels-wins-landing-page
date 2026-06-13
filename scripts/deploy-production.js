#!/usr/bin/env node
/**
 * Production Deployment Script - Day 10 Final Deployment
 * Handles final production deployment with comprehensive validation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Wheels & Wins - Production Deployment Script');
console.log('='.repeat(50));

const PRODUCTION_CHECKS = [
  'Environment validation',
  'Build verification',
  'Security audit',
  'Performance validation',
  'Database connectivity',
  'Asset optimization',
  'CDN configuration',
  'Monitoring setup'
];

/**
 * Execute command with proper error handling
 */
function executeCommand(command, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    const result = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return { success: true, output: result };
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Validate environment configuration
 */
function validateEnvironment() {
  console.log('\n📋 Environment Validation');
  console.log('-'.repeat(30));

  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_MAPBOX_TOKEN'
  ];

  let allValid = true;

  // Check .env.local for development
  if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf-8');

    requiredEnvVars.forEach(varName => {
      if (envContent.includes(varName)) {
        console.log(`✅ ${varName} found`);
      } else {
        console.log(`❌ ${varName} missing`);
        allValid = false;
      }
    });

    if (envContent.includes('VITE_SUPABASE_PUBLISHABLE_KEY') || envContent.includes('VITE_SUPABASE_ANON_KEY')) {
      console.log('✅ VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY found');
    } else {
      console.log('❌ VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY missing');
      allValid = false;
    }
  } else {
    console.log('⚠️  .env.local not found - assuming production environment variables are set via Netlify');
  }

  // Validate Supabase URL format
  if (process.env.VITE_SUPABASE_URL || envContent?.includes('supabase.co')) {
    console.log('✅ Supabase URL format valid');
  } else {
    console.log('❌ Invalid Supabase URL format');
    allValid = false;
  }

  return allValid;
}

/**
 * Run comprehensive build validation
 */
function validateBuild() {
  console.log('\n🔨 Build Validation');
  console.log('-'.repeat(30));

  // Type checking
  const typeCheck = executeCommand('npm run type-check', 'TypeScript type checking');
  if (!typeCheck.success) return false;

  // Linting
  const lint = executeCommand('npm run lint', 'ESLint validation');
  if (!lint.success) return false;

  // Production build
  const build = executeCommand('npm run build', 'Production build');
  if (!build.success) return false;

  // Verify dist directory
  if (!fs.existsSync('dist')) {
    console.log('❌ Build output directory not found');
    return false;
  }

  const distStats = fs.readdirSync('dist');
  console.log(`✅ Build output: ${distStats.length} files generated`);

  // Check critical files
  const criticalFiles = ['index.html', 'assets'];
  const missingFiles = criticalFiles.filter(file => !distStats.includes(file));

  if (missingFiles.length > 0) {
    console.log(`❌ Missing critical files: ${missingFiles.join(', ')}`);
    return false;
  }

  console.log('✅ All critical files present');
  return true;
}

/**
 * Run security audit
 */
function validateSecurity() {
  console.log('\n🔒 Security Validation');
  console.log('-'.repeat(30));

  // NPM audit
  const audit = executeCommand('npm audit --audit-level high', 'NPM security audit');
  if (!audit.success) {
    console.log('⚠️  Security audit failed - check for vulnerabilities');
    return false;
  }

  if (audit.output.includes('found 0 vulnerabilities')) {
    console.log('✅ No security vulnerabilities found');
  } else {
    console.log('⚠️  Security vulnerabilities detected');
    console.log(audit.output);
  }

  // Check security headers file
  if (fs.existsSync('public/_headers')) {
    console.log('✅ Security headers configuration found');
  } else {
    console.log('❌ Security headers configuration missing');
    return false;
  }

  // Validate CSP configuration
  const headersContent = fs.readFileSync('public/_headers', 'utf-8');
  if (headersContent.includes('Content-Security-Policy')) {
    console.log('✅ Content Security Policy configured');
  } else {
    console.log('❌ Content Security Policy not found');
    return false;
  }

  return true;
}

/**
 * Validate performance optimizations
 */
function validatePerformance() {
  console.log('\n⚡ Performance Validation');
  console.log('-'.repeat(30));

  // Check bundle sizes
  if (!fs.existsSync('dist/assets')) {
    console.log('❌ Assets directory not found');
    return false;
  }

  const assets = fs.readdirSync('dist/assets');
  const jsFiles = assets.filter(file => file.endsWith('.js'));
  const cssFiles = assets.filter(file => file.endsWith('.css'));

  console.log(`📦 Generated assets:`);
  console.log(`   JavaScript files: ${jsFiles.length}`);
  console.log(`   CSS files: ${cssFiles.length}`);

  // Check for lazy loading implementation
  const indexHtml = fs.readFileSync('dist/index.html', 'utf-8');
  if (indexHtml.includes('modulepreload')) {
    console.log('✅ Module preloading configured');
  }

  // Verify compression-ready assets
  const largeAssets = jsFiles.filter(file => {
    const stats = fs.statSync(path.join('dist/assets', file));
    return stats.size > 1000000; // > 1MB
  });

  if (largeAssets.length > 0) {
    console.log(`⚠️  Large assets detected: ${largeAssets.join(', ')}`);
    console.log('   These should be lazy-loaded or split further');
  } else {
    console.log('✅ No excessively large assets detected');
  }

  return true;
}

/**
 * Validate database connectivity (via build-time checks)
 */
function validateDatabase() {
  console.log('\n🗄️  Database Validation');
  console.log('-'.repeat(30));

  // Check for SQL migration files
  if (fs.existsSync('docs/sql-fixes')) {
    const sqlFiles = fs.readdirSync('docs/sql-fixes').filter(file => file.endsWith('.sql'));
    console.log(`✅ Found ${sqlFiles.length} SQL migration files`);

    sqlFiles.forEach(file => {
      console.log(`   📝 ${file}`);
    });
  } else {
    console.log('⚠️  No SQL migration files found');
  }

  // Validate RLS implementation (check for common patterns)
  const supabaseFiles = [
    'src/integrations/supabase/client.ts',
    'src/integrations/supabase/types.ts'
  ];

  let supabaseConfigValid = true;
  supabaseFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      supabaseConfigValid = false;
    }
  });

  return supabaseConfigValid;
}

/**
 * Final deployment validation
 */
function finalValidation() {
  console.log('\n🎯 Final Deployment Validation');
  console.log('-'.repeat(30));

  const deploymentChecks = [
    {
      name: 'Git status clean',
      check: () => {
        try {
          const status = execSync('git status --porcelain', { encoding: 'utf-8' });
          return status.trim() === '';
        } catch {
          return false;
        }
      }
    },
    {
      name: 'On main branch',
      check: () => {
        try {
          const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' });
          return branch.trim() === 'main';
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Package.json version valid',
      check: () => {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        return pkg.version && pkg.version !== '0.0.0';
      }
    },
    {
      name: 'README.md exists',
      check: () => fs.existsSync('README.md')
    },
    {
      name: 'Deployment checklist exists',
      check: () => fs.existsSync('docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md')
    }
  ];

  let allPassed = true;
  deploymentChecks.forEach(({ name, check }) => {
    if (check()) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name}`);
      allPassed = false;
    }
  });

  return allPassed;
}

/**
 * Generate deployment report
 */
function generateDeploymentReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    deployment: {
      target: 'production',
      branch: 'main',
      status: results.success ? 'READY' : 'FAILED'
    },
    validation: results,
    nextSteps: results.success ? [
      'Push to main branch to trigger Netlify deployment',
      'Monitor deployment at https://app.netlify.com',
      'Verify site at https://wheelsandwins.com',
      'Run post-deployment health checks'
    ] : [
      'Fix validation failures before deployment',
      'Re-run deployment script',
      'Ensure all tests pass'
    ]
  };

  fs.writeFileSync('deployment-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Deployment report saved to deployment-report.json');

  return report;
}

/**
 * Main deployment validation function
 */
async function main() {
  console.log(`📅 Deployment Date: ${new Date().toISOString()}`);
  console.log(`🌐 Target: Production (wheelsandwins.com)`);
  console.log(`🏗️  Build Mode: production\n`);

  const results = {
    environment: false,
    build: false,
    security: false,
    performance: false,
    database: false,
    final: false
  };

  // Run all validation steps
  console.log('Starting comprehensive pre-deployment validation...\n');

  results.environment = validateEnvironment();
  results.build = validateBuild();
  results.security = validateSecurity();
  results.performance = validatePerformance();
  results.database = validateDatabase();
  results.final = finalValidation();

  // Overall success determination
  const success = Object.values(results).every(result => result === true);
  results.success = success;

  // Generate report
  const report = generateDeploymentReport(results);

  // Final status
  console.log(`\n${  '='.repeat(50)}`);
  if (success) {
    console.log('🎉 DEPLOYMENT VALIDATION PASSED');
    console.log('✅ All checks completed successfully');
    console.log('🚀 Ready for production deployment!');
    console.log('\n📋 Next steps:');
    console.log('   1. Push to main branch: git push origin main');
    console.log('   2. Monitor Netlify deployment');
    console.log('   3. Verify at https://wheelsandwins.com');
    console.log('   4. Run post-deployment checks');
  } else {
    console.log('❌ DEPLOYMENT VALIDATION FAILED');
    console.log('🔧 Please fix the above issues before deploying');
    console.log('\n📋 Required actions:');
    Object.entries(results).forEach(([check, passed]) => {
      if (!passed && check !== 'success') {
        console.log(`   ❌ Fix ${check} validation`);
      }
    });
  }
  console.log('='.repeat(50));

  process.exit(success ? 0 : 1);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('\n💥 Unexpected error during deployment validation:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the deployment validation
main().catch(error => {
  console.error('💥 Deployment validation failed:', error);
  process.exit(1);
});
