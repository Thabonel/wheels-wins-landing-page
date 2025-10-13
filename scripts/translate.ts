#!/usr/bin/env tsx
/**
 * AI-Powered Translation Script for Wheels & Wins
 *
 * Uses Claude Sonnet 4.5 to translate the entire app from English to multiple languages.
 *
 * Features:
 * - Context-aware translation (RV travel domain)
 * - Preserves existing translations
 * - Handles variables like {{amount}}, {{distance}}
 * - Rate-limited API calls
 * - Batch processing for efficiency
 *
 * Usage:
 *   npm run translate              # Translate all missing keys
 *   npm run translate:missing      # Only missing keys
 *   npm run translate:lang -- de   # Translate specific language
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  languages: ['es', 'fr', 'de', 'tr', 'es-AR'],
  aiProvider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  localesDir: path.join(__dirname, '..', 'src', 'locales'),
  batchSize: 50,
  rateLimit: 10, // requests per minute
  context: `You are translating a web app for RV travelers and nomadic families.
Key context:
- "PAM" is the AI assistant name (don't translate)
- "Wheels & Wins" is the brand name (don't translate)
- "RV" means recreational vehicle
- Focus on natural, conversational language
- Target audience: 50-75 year old travelers, snowbirds, retirees
- Keep technical terms consistent
- Preserve all variables like {{amount}}, {{distance}}, {{name}}
`,
  glossary: {
    'PAM': 'PAM', // Never translate
    'Wheels & Wins': 'Wheels & Wins', // Never translate
    'RV': 'RV', // Keep as-is
    'snowbird': {
      es: 'snowbird',
      fr: 'snowbird',
      de: 'Wintervogel',
      tr: 'kış göçmeni',
      'es-AR': 'viajero de invierno'
    },
    'trip planner': {
      es: 'planificador de viajes',
      fr: 'planificateur de voyage',
      de: 'Reiseplaner',
      tr: 'seyahat planlayıcısı',
      'es-AR': 'planificador de viajes'
    }
  }
};

// Language names for better prompts
const LANGUAGE_NAMES: Record<string, string> = {
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'tr': 'Turkish',
  'es-AR': 'Argentine Spanish'
};

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Load JSON file
 */
async function loadJSON(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

/**
 * Save JSON file with formatting
 */
async function saveJSON(filePath: string, data: any): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content + '\n', 'utf-8');
}

/**
 * Flatten nested object to dot notation
 */
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flat, flattenObject(value, newKey));
    } else if (typeof value === 'string') {
      flat[newKey] = value;
    }
  }

  return flat;
}

/**
 * Unflatten dot notation to nested object
 */
function unflattenObject(flat: Record<string, string>): any {
  const result: any = {};

  for (const [key, value] of Object.entries(flat)) {
    const keys = key.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

/**
 * Translate a batch of strings using Claude
 */
async function translateBatch(
  texts: Record<string, string>,
  targetLanguage: string
): Promise<Record<string, string>> {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  // Build glossary context
  const glossaryContext = Object.entries(CONFIG.glossary)
    .map(([term, translation]) => {
      if (typeof translation === 'string') {
        return `- "${term}" → "${translation}" (never translate)`;
      } else if (typeof translation === 'object' && targetLanguage in translation) {
        return `- "${term}" → "${translation[targetLanguage as keyof typeof translation]}"`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  const prompt = `${CONFIG.context}

GLOSSARY FOR ${languageName.toUpperCase()}:
${glossaryContext}

IMPORTANT RULES:
1. Translate naturally for ${languageName} speakers
2. NEVER translate: PAM, Wheels & Wins, RV
3. PRESERVE all variables EXACTLY: {{amount}}, {{distance}}, etc.
4. Keep the same tone: friendly, helpful, professional
5. Target audience: 50-75 year old travelers

Translate these English strings to ${languageName}. Return ONLY a JSON object with the same keys and translated values.

Input JSON:
${JSON.stringify(texts, null, 2)}

Output JSON (translated to ${languageName}):`;

  const message = await anthropic.messages.create({
    model: CONFIG.model,
    max_tokens: 4096,
    temperature: 0.3, // Lower temperature for more consistent translations
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  // Extract JSON from response
  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse the JSON response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Translate missing keys for a language
 */
async function translateLanguage(
  targetLanguage: string,
  englishFlat: Record<string, string>,
  existingFlat: Record<string, string>,
  missingOnly: boolean = false
): Promise<Record<string, string>> {
  console.log(`\n🌍 Translating to ${LANGUAGE_NAMES[targetLanguage]} (${targetLanguage})...`);

  // Find missing keys
  const missingKeys = Object.keys(englishFlat).filter(
    key => !(key in existingFlat)
  );

  if (missingKeys.length === 0) {
    console.log(`✅ No missing translations for ${targetLanguage}`);
    return existingFlat;
  }

  console.log(`📝 Found ${missingKeys.length} missing translations`);

  // If we're in missing-only mode but no keys are missing, return existing
  if (missingOnly && missingKeys.length === 0) {
    return existingFlat;
  }

  // Process in batches
  const result = { ...existingFlat };
  const batches: Array<Record<string, string>> = [];

  for (let i = 0; i < missingKeys.length; i += CONFIG.batchSize) {
    const batchKeys = missingKeys.slice(i, i + CONFIG.batchSize);
    const batch: Record<string, string> = {};

    for (const key of batchKeys) {
      batch[key] = englishFlat[key];
    }

    batches.push(batch);
  }

  // Translate each batch with rate limiting
  const msPerRequest = (60 * 1000) / CONFIG.rateLimit;

  for (let i = 0; i < batches.length; i++) {
    console.log(`  Batch ${i + 1}/${batches.length} (${Object.keys(batches[i]).length} strings)...`);

    try {
      const translated = await translateBatch(batches[i], targetLanguage);
      Object.assign(result, translated);

      // Rate limit (except for last batch)
      if (i < batches.length - 1) {
        await delay(msPerRequest);
      }
    } catch (error) {
      console.error(`❌ Error translating batch ${i + 1}:`, error);
      throw error;
    }
  }

  console.log(`✅ Translated ${missingKeys.length} strings for ${targetLanguage}`);
  return result;
}

/**
 * Main translation function
 */
async function main() {
  console.log('🚀 Wheels & Wins AI Translation System\n');

  // Parse command line args
  const args = process.argv.slice(2);
  const missingOnly = args.includes('--missing-only');
  const langArg = args.find(arg => arg.startsWith('--lang='));
  const specificLang = langArg ? langArg.split('=')[1] : null;

  // Load English master file
  const englishPath = path.join(CONFIG.localesDir, 'en.json');
  console.log(`📖 Loading English master: ${englishPath}`);
  const english = await loadJSON(englishPath);
  const englishFlat = flattenObject(english);
  console.log(`   Found ${Object.keys(englishFlat).length} translation keys\n`);

  // Determine which languages to translate
  const languages = specificLang ? [specificLang] : CONFIG.languages;

  // Translate each language
  const startTime = Date.now();
  let totalTranslations = 0;

  for (const lang of languages) {
    const langPath = path.join(CONFIG.localesDir, `${lang}.json`);
    const existing = await loadJSON(langPath);
    const existingFlat = flattenObject(existing);

    const translatedFlat = await translateLanguage(
      lang,
      englishFlat,
      existingFlat,
      missingOnly
    );

    totalTranslations += Object.keys(translatedFlat).length - Object.keys(existingFlat).length;

    // Convert back to nested object and save
    const translatedNested = unflattenObject(translatedFlat);
    await saveJSON(langPath, translatedNested);
    console.log(`💾 Saved: ${langPath}`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✨ Translation complete!`);
  console.log(`   Translated ${totalTranslations} strings in ${duration}s`);
  console.log(`   Languages updated: ${languages.join(', ')}`);

  // Cost estimate (Claude Sonnet 4.5: ~$3 per 1M input tokens, ~$15 per 1M output tokens)
  const estimatedCost = totalTranslations * 0.0001; // Very rough estimate
  console.log(`   Estimated cost: ~$${estimatedCost.toFixed(2)}`);
}

// Run
main().catch(error => {
  console.error('\n❌ Translation failed:', error);
  process.exit(1);
});
