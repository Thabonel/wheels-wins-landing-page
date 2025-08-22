const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const routes = [
  '/',
  '/wheels',
  '/wins',
  '/social',
  '/shop',
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/cookies'
];

async function prerender() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  for (const route of routes) {
    try {
      console.log(`Pre-rendering ${route}...`);
      
      // Navigate to page
      await page.goto(`http://localhost:8080${route}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Wait for React to fully render
      await page.waitForSelector('#root > *', { timeout: 10000 });
      
      // Get rendered HTML
      const html = await page.content();
      
      // Clean up the HTML for SEO
      const cleanedHtml = html
        .replace(/<script.*?<\/script>/gs, '') // Remove scripts for crawlers
        .replace(/data-reactroot=""/g, '') // Remove React attributes
        .replace(/<!-- -->/g, ''); // Remove empty comments
      
      // Save pre-rendered HTML
      const fileName = route === '/' ? 'index' : route.substring(1);
      const filePath = path.join(__dirname, '..', 'dist', 'prerendered', `${fileName}.html`);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, cleanedHtml);
      
      console.log(`✅ Pre-rendered ${route}`);
    } catch (error) {
      console.error(`❌ Failed to pre-render ${route}:`, error.message);
    }
  }
  
  await browser.close();
  console.log('✅ Pre-rendering complete!');
}

// Add to package.json scripts:
// "postbuild": "node scripts/prerender.js"

module.exports = prerender;

if (require.main === module) {
  prerender().catch(console.error);
}