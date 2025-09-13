import { CrawlResult } from './crawler.helper';
import * as fs from 'fs';
import * as path from 'path';

export class ReportGenerator {
  generateHTMLReport(results: CrawlResult[], summary: any): string {
    const timestamp = new Date().toLocaleString();
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wheels & Wins - Site Crawler Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { 
      max-width: 1400px; 
      margin: 0 auto; 
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    h1 { font-size: 2.5em; margin-bottom: 10px; }
    .subtitle { opacity: 0.9; font-size: 1.1em; }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .stat-card h3 {
      color: #6b7280;
      font-size: 0.9em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #1f2937;
    }
    
    .stat-detail {
      margin-top: 5px;
      font-size: 0.9em;
      color: #9ca3af;
    }
    
    .results { padding: 30px; }
    
    .page-result {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    
    .page-header {
      padding: 20px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .page-title {
      font-size: 1.2em;
      font-weight: 600;
      color: #1f2937;
    }
    
    .page-url {
      font-size: 0.9em;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .status-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-pass { background: #10b981; color: white; }
    .status-fail { background: #ef4444; color: white; }
    .status-warning { background: #f59e0b; color: white; }
    
    .page-details {
      padding: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .detail-section {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
    }
    
    .detail-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .detail-content {
      font-size: 0.9em;
      color: #6b7280;
    }
    
    .error-list, .warning-list {
      margin-top: 10px;
      padding: 10px;
      border-radius: 6px;
      font-size: 0.85em;
    }
    
    .error-list {
      background: #fee;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    
    .warning-list {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }
    
    .error-item, .warning-item {
      margin: 5px 0;
      padding-left: 20px;
      position: relative;
    }
    
    .error-item:before, .warning-item:before {
      content: "•";
      position: absolute;
      left: 5px;
    }
    
    .load-time {
      color: #10b981;
      font-weight: 600;
    }
    
    .slow-load {
      color: #f59e0b;
    }
    
    .very-slow-load {
      color: #ef4444;
    }

    .icon {
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 5px;
      vertical-align: middle;
    }

    .footer {
      background: #1f2937;
      color: white;
      text-align: center;
      padding: 20px;
      font-size: 0.9em;
    }

    @media (max-width: 768px) {
      .summary { grid-template-columns: 1fr; }
      .page-details { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚐 Wheels & Wins Site Crawler Report</h1>
      <p class="subtitle">Generated on ${timestamp}</p>
    </div>
    
    <div class="summary">
      <div class="stat-card">
        <h3>📄 Pages Tested</h3>
        <div class="stat-value">${summary.pages.total}</div>
        <div class="stat-detail">
          ✅ ${summary.pages.passed} passed, 
          ❌ ${summary.pages.failed} failed, 
          ⚠️ ${summary.pages.warnings} warnings
        </div>
      </div>
      
      <div class="stat-card">
        <h3>🔘 Buttons</h3>
        <div class="stat-value">${summary.buttons.total}</div>
        <div class="stat-detail">
          ${summary.buttons.clickable} clickable (${Math.round(summary.buttons.clickable / summary.buttons.total * 100)}%)
        </div>
      </div>
      
      <div class="stat-card">
        <h3>📝 Forms</h3>
        <div class="stat-value">${summary.forms.total}</div>
        <div class="stat-detail">
          ${summary.forms.submittable} submittable (${Math.round(summary.forms.submittable / summary.forms.total * 100)}%)
        </div>
      </div>
      
      <div class="stat-card">
        <h3>🔗 Links</h3>
        <div class="stat-value">${summary.links.total}</div>
        <div class="stat-detail">
          ${summary.links.reachable} reachable (${Math.round(summary.links.reachable / summary.links.total * 100)}%)
        </div>
      </div>
      
      <div class="stat-card">
        <h3>⚡ Avg Load Time</h3>
        <div class="stat-value">${(summary.avgLoadTime / 1000).toFixed(2)}s</div>
        <div class="stat-detail">
          ${summary.avgLoadTime < 2000 ? 'Good performance' : summary.avgLoadTime < 4000 ? 'Needs improvement' : 'Poor performance'}
        </div>
      </div>
    </div>
    
    <div class="results">
      <h2 style="margin-bottom: 20px; color: #1f2937;">Detailed Results</h2>
      ${results.map(result => this.generatePageResult(result)).join('')}
    </div>
    
    <div class="footer">
      <p>Generated by Wheels & Wins Automated Testing Suite</p>
      <p>Powered by Playwright & TypeScript</p>
    </div>
  </div>
</body>
</html>`;
    return html;
  }

  private generatePageResult(result: CrawlResult): string {
    const loadTimeClass = result.loadTime < 2000 ? 'load-time' : 
                          result.loadTime < 4000 ? 'slow-load' : 'very-slow-load';
    
    return `
    <div class="page-result">
      <div class="page-header">
        <div>
          <div class="page-title">${result.title || 'Untitled Page'}</div>
          <div class="page-url">${result.url}</div>
        </div>
        <span class="status-badge status-${result.status}">${result.status}</span>
      </div>
      
      <div class="page-details">
        <div class="detail-section">
          <div class="detail-title">
            ⏱️ Performance
          </div>
          <div class="detail-content">
            Load time: <span class="${loadTimeClass}">${(result.loadTime / 1000).toFixed(2)}s</span>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-title">
            🔘 Buttons
          </div>
          <div class="detail-content">
            ${result.buttons.length} found<br>
            ${result.buttons.filter(b => b.clickable).length} clickable<br>
            ${result.buttons.filter(b => b.error).length} with errors
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-title">
            📝 Forms
          </div>
          <div class="detail-content">
            ${result.forms.length} found<br>
            ${result.forms.filter(f => f.submittable).length} submittable<br>
            Total fields: ${result.forms.reduce((sum, f) => sum + f.fields, 0)}
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-title">
            🔗 Links
          </div>
          <div class="detail-content">
            ${result.links.length} found<br>
            ${result.links.filter(l => l.reachable).length} reachable<br>
            ${result.links.filter(l => l.error).length} broken
          </div>
        </div>
      </div>
      
      ${result.errors.length > 0 ? `
        <div class="error-list">
          <strong>Errors:</strong>
          ${result.errors.map(e => `<div class="error-item">${this.escapeHtml(e)}</div>`).join('')}
        </div>
      ` : ''}
      
      ${result.warnings.length > 0 ? `
        <div class="warning-list">
          <strong>Warnings:</strong>
          ${result.warnings.map(w => `<div class="warning-item">${this.escapeHtml(w)}</div>`).join('')}
        </div>
      ` : ''}
    </div>`;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  async saveReport(results: CrawlResult[], summary: any) {
    // Ensure directories exist
    const reportDir = path.join(process.cwd(), 'playwright-report');
    const resultsDir = path.join(process.cwd(), 'test-results');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Save HTML report
    const htmlReport = this.generateHTMLReport(results, summary);
    const htmlPath = path.join(reportDir, 'site-crawler-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`📄 HTML Report saved to: ${htmlPath}`);

    // Save JSON data
    const jsonData = {
      timestamp: new Date().toISOString(),
      summary,
      results
    };
    const jsonPath = path.join(resultsDir, 'crawler-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log(`📊 JSON Data saved to: ${jsonPath}`);

    // Print summary to console
    console.log(`\n${  '='.repeat(60)}`);
    console.log('📊 WHEELS & WINS SITE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ PASSED: ${summary.pages.passed}/${summary.pages.total} pages`);
    console.log(`❌ FAILED: ${summary.pages.failed}/${summary.pages.total} pages`);
    console.log(`⚠️  WARNINGS: ${summary.pages.warnings}/${summary.pages.total} pages`);
    console.log(`\n🔘 Buttons: ${summary.buttons.clickable}/${summary.buttons.total} working`);
    console.log(`📝 Forms: ${summary.forms.submittable}/${summary.forms.total} submittable`);
    console.log(`🔗 Links: ${summary.links.reachable}/${summary.links.total} reachable`);
    console.log(`⚡ Average Load Time: ${(summary.avgLoadTime / 1000).toFixed(2)}s`);
    console.log(`\n${  '='.repeat(60)}`);
  }
}