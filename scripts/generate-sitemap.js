#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define your routes here
const routes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/wheels', priority: '0.9', changefreq: 'weekly' },
  { path: '/wins', priority: '0.9', changefreq: 'weekly' },
  { path: '/social', priority: '0.8', changefreq: 'daily' },
  { path: '/shop', priority: '0.8', changefreq: 'daily' },
  { path: '/you', priority: '0.7', changefreq: 'weekly' },
  { path: '/login', priority: '0.6', changefreq: 'monthly' },
  { path: '/signup', priority: '0.7', changefreq: 'monthly' },
  { path: '/profile', priority: '0.5', changefreq: 'monthly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookies', priority: '0.3', changefreq: 'yearly' },
];

const generateSitemap = () => {
  const baseUrl = process.env.VITE_APP_URL || 'https://wheelsandwins.com';
  const lastmod = new Date().toISOString().split('T')[0];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`;

  routes.forEach(route => {
    sitemap += `
  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  });

  sitemap += '\n</urlset>';

  // Write sitemap
  const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  console.log(`✅ Sitemap generated at: ${sitemapPath}`);

  // Also generate a sitemap index for future expansion
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`;

  const indexPath = path.join(__dirname, '..', 'public', 'sitemap-index.xml');
  fs.writeFileSync(indexPath, sitemapIndex);
  console.log(`✅ Sitemap index generated at: ${indexPath}`);
};

// Run the generator
generateSitemap();

module.exports = generateSitemap;