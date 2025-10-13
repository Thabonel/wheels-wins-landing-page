#!/usr/bin/env node
/**
 * Free Translation Automation Script
 * Uses Gemini API (free tier) to translate React components
 *
 * Usage: GEMINI_API_KEY=your-key node scripts/translate-components.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Components to translate (high priority landing page components)
const COMPONENTS_TO_TRANSLATE = [
  'src/components/PamSpotlight.tsx',
  'src/components/HowItWorks.tsx',
  'src/components/FeaturedProduct.tsx',
  'src/components/PricingPlans.tsx',
  'src/components/Testimonials.tsx',
  'src/components/CallToAction.tsx',
  'src/components/Footer.tsx',
];

// Extract text from JSX
function extractTextFromComponent(content) {
  const textPatterns = [
    // Text in JSX tags: <h1>Text</h1>
    />([^<>{}\n]+)</g,
    // Text in quotes: "Text" or 'Text'
    /["']([^"']+)["']/g,
  ];

  const extractedText = new Set();

  for (const pattern of textPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const text = match[1].trim();
      // Filter out code, imports, props, etc.
      if (text.length > 3 &&
          !text.includes('import') &&
          !text.includes('from') &&
          !text.includes('className') &&
          !text.includes('const') &&
          !text.includes('=>') &&
          !/^[a-z]+$/.test(text) && // single lowercase words (likely props)
          !/^\d+$/.test(text) && // numbers only
          text.match(/[A-Z]/) // has at least one capital letter
      ) {
        extractedText.add(text);
      }
    }
  }

  return Array.from(extractedText);
}

// Translate using Gemini
async function translateWithGemini(texts, targetLanguage) {
  const languageNames = {
    es: 'Spanish',
    fr: 'French'
  };

  const prompt = `Translate these English phrases to ${languageNames[targetLanguage]} for an RV travel website.
Keep the same tone (friendly, helpful) and maintain any technical terms like "RV", "PAM".
Return ONLY a JSON object where keys are the English phrases and values are the translations.

English phrases:
${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return format:
{
  "English phrase 1": "Translated phrase 1",
  "English phrase 2": "Translated phrase 2"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error('Failed to parse translation response');
}

// Generate translation key from text
function generateKey(text, componentName) {
  const component = componentName.replace('.tsx', '').toLowerCase();
  const key = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);

  return `${component}.${key}`;
}

// Main translation function
async function translateComponents() {
  console.log('🚀 Starting free translation automation...\n');

  const translations = {
    en: {},
    es: {},
    fr: {}
  };

  for (const componentPath of COMPONENTS_TO_TRANSLATE) {
    const fullPath = path.join(process.cwd(), componentPath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Skipping ${componentPath} (not found)`);
      continue;
    }

    console.log(`📝 Processing ${componentPath}...`);

    const content = fs.readFileSync(fullPath, 'utf-8');
    const texts = extractTextFromComponent(content);

    if (texts.length === 0) {
      console.log(`   No translatable text found\n`);
      continue;
    }

    console.log(`   Found ${texts.length} text strings`);

    // Translate to Spanish
    console.log(`   🇪🇸 Translating to Spanish...`);
    const spanishTranslations = await translateWithGemini(texts, 'es');

    // Translate to French
    console.log(`   🇫🇷 Translating to French...`);
    const frenchTranslations = await translateWithGemini(texts, 'fr');

    // Build translation keys
    const componentName = path.basename(componentPath);
    texts.forEach(text => {
      const key = generateKey(text, componentName);
      translations.en[key] = text;
      translations.es[key] = spanishTranslations[text] || text;
      translations.fr[key] = frenchTranslations[text] || text;
    });

    console.log(`   ✅ Translated!\n`);

    // Rate limit: wait 1 second between components
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Update translation files
  console.log('📦 Updating translation files...');

  const localesDir = path.join(process.cwd(), 'src/locales');

  for (const [lang, newTranslations] of Object.entries(translations)) {
    const filePath = path.join(localesDir, `${lang}.json`);
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Merge new translations
    const merged = { ...existing, ...newTranslations };

    fs.writeFileSync(
      filePath,
      JSON.stringify(merged, null, 2),
      'utf-8'
    );

    console.log(`   ✅ Updated ${lang}.json (${Object.keys(newTranslations).length} new keys)`);
  }

  console.log('\n✨ Translation complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the updated translation files in src/locales/');
  console.log('2. Update components to use t() function');
  console.log('3. Test language switching\n');
}

// Run
translateComponents().catch(console.error);
