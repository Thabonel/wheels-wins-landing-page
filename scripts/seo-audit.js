#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SEOAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
  }

  // Check if file exists
  checkFile(filePath, description) {
    const fullPath = path.join(__dirname, '..', 'public', filePath);
    if (fs.existsSync(fullPath)) {
      this.successes.push(`✅ ${description} exists at ${filePath}`);
      return true;
    } else {
      this.issues.push(`❌ MISSING: ${description} - Create ${filePath}`);
      return false;
    }
  }

  // Check meta tags in index.html
  checkMetaTags() {
    const indexPath = path.join(__dirname, '..', 'index.html');
    const content = fs.readFileSync(indexPath, 'utf8');

    // Required meta tags
    const requiredMeta = [
      { pattern: /<meta name="description"/, name: 'Meta Description' },
      { pattern: /<link rel="canonical"/, name: 'Canonical URL' },
      { pattern: /<meta property="og:title"/, name: 'Open Graph Title' },
      { pattern: /<meta property="og:image"/, name: 'Open Graph Image' },
      { pattern: /<meta name="robots"/, name: 'Robots Meta' },
      { pattern: /application\/ld\+json/, name: 'Schema Markup' }
    ];

    requiredMeta.forEach(meta => {
      if (meta.pattern.test(content)) {
        this.successes.push(`✅ ${meta.name} found`);
      } else {
        this.issues.push(`❌ MISSING: ${meta.name}`);
      }
    });

    // Check title length
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    if (titleMatch) {
      const titleLength = titleMatch[1].length;
      if (titleLength > 60) {
        this.warnings.push(`⚠️ Title too long (${titleLength} chars) - Keep under 60`);
      } else if (titleLength < 30) {
        this.warnings.push(`⚠️ Title too short (${titleLength} chars) - Aim for 30-60`);
      } else {
        this.successes.push(`✅ Title length optimal (${titleLength} chars)`);
      }
    }

    // Check description length
    const descMatch = content.match(/<meta name="description" content="(.*?)"/);
    if (descMatch) {
      const descLength = descMatch[1].length;
      if (descLength > 160) {
        this.warnings.push(`⚠️ Description too long (${descLength} chars) - Keep under 160`);
      } else if (descLength < 120) {
        this.warnings.push(`⚠️ Description too short (${descLength} chars) - Aim for 120-160`);
      } else {
        this.successes.push(`✅ Description length optimal (${descLength} chars)`);
      }
    }
  }

  // Check robots.txt
  checkRobotsTxt() {
    const robotsPath = path.join(__dirname, '..', 'public', 'robots.txt');
    if (fs.existsSync(robotsPath)) {
      const content = fs.readFileSync(robotsPath, 'utf8');
      
      if (content.includes('Sitemap:')) {
        this.successes.push('✅ Sitemap reference in robots.txt');
      } else {
        this.issues.push('❌ No sitemap reference in robots.txt');
      }

      if (content.includes('User-agent: *')) {
        this.successes.push('✅ Default user-agent rules defined');
      } else {
        this.warnings.push('⚠️ No default user-agent rules');
      }
    }
  }

  // Check build output
  checkBuildOptimization() {
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      const checkLargeFiles = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            checkLargeFiles(filePath);
          } else if (file.endsWith('.js') || file.endsWith('.css')) {
            const sizeKB = stat.size / 1024;
            if (sizeKB > 250) {
              this.warnings.push(`⚠️ Large file: ${file} (${sizeKB.toFixed(1)}KB) - Consider splitting`);
            }
          }
        });
      };
      
      checkLargeFiles(distPath);
    }
  }

  // Check for common SEO files
  checkSEOFiles() {
    this.checkFile('sitemap.xml', 'XML Sitemap');
    this.checkFile('robots.txt', 'Robots.txt');
    this.checkFile('favicon.ico', 'Favicon');
    this.checkFile('manifest.json', 'Web App Manifest');
    
    // Check for opengraph image
    const ogImageExists = this.checkFile('opengraph-image.png', 'Open Graph Image');
    if (!ogImageExists) {
      this.warnings.push('⚠️ Using fallback image for social sharing');
    }
  }

  // Generate report
  generateReport() {
    console.log('\n🔍 SEO AUDIT REPORT FOR WHEELS & WINS\n');
    console.log('=' .repeat(50));
    
    if (this.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES (' + this.issues.length + '):\n');
      this.issues.forEach(issue => console.log('  ' + issue));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (' + this.warnings.length + '):\n');
      this.warnings.forEach(warning => console.log('  ' + warning));
    }
    
    if (this.successes.length > 0) {
      console.log('\n✅ PASSED CHECKS (' + this.successes.length + '):\n');
      this.successes.forEach(success => console.log('  ' + success));
    }
    
    // Score calculation
    const totalChecks = this.issues.length + this.warnings.length + this.successes.length;
    const score = Math.round((this.successes.length / totalChecks) * 100);
    
    console.log('\n' + '=' .repeat(50));
    console.log(`\n📊 SEO SCORE: ${score}% (${this.successes.length}/${totalChecks} checks passed)\n`);
    
    // Recommendations
    console.log('🎯 TOP PRIORITIES:\n');
    if (this.issues.includes('❌ MISSING: Open Graph Image - Create opengraph-image.png')) {
      console.log('  1. Create opengraph-image.png (1200x630px) for social sharing');
    }
    if (this.issues.length > 0) {
      console.log('  2. Fix all critical issues listed above');
    }
    console.log('  3. Implement server-side rendering or static generation');
    console.log('  4. Set up regular Lighthouse CI monitoring');
    console.log('  5. Create location-specific landing pages for local SEO\n');
  }

  // Run full audit
  async runAudit() {
    console.log('🚀 Starting SEO audit...\n');
    
    this.checkSEOFiles();
    this.checkMetaTags();
    this.checkRobotsTxt();
    this.checkBuildOptimization();
    
    this.generateReport();
  }
}

// Run audit
const auditor = new SEOAuditor();
auditor.runAudit();

export default SEOAuditor;