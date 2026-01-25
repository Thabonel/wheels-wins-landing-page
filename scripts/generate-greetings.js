#!/usr/bin/env node
/**
 * Generate pre-rendered PAM greeting audio files using OpenAI TTS API
 *
 * These files are played instantly on wake word detection to eliminate
 * the delay while connecting to OpenAI Realtime API.
 *
 * Voice: coral (warm, friendly female voice - matches PAM's realtime voice)
 *
 * Usage: node scripts/generate-greetings.js
 * Requires: OPENAI_API_KEY environment variable
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const GREETINGS = [
  { id: 'greeting-1', text: "Hi! How can I help you?" },
  { id: 'greeting-2', text: "Hey there! What can I do for you?" },
  { id: 'greeting-3', text: "Hi! What's on your mind?" },
  { id: 'greeting-4', text: "Hello! How can I help?" }
];

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'greetings');

async function generateGreeting(greeting) {
  console.log(`Generating: "${greeting.text}"...`);

  const response = await openai.audio.speech.create({
    model: 'tts-1',  // Use tts-1 for lower latency (tts-1-hd for higher quality)
    voice: 'coral',  // Same voice as PAM's realtime voice
    input: greeting.text,
    response_format: 'mp3'
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const outputPath = path.join(OUTPUT_DIR, `${greeting.id}.mp3`);

  fs.writeFileSync(outputPath, buffer);
  console.log(`  Saved: ${outputPath} (${buffer.length} bytes)`);

  return outputPath;
}

async function main() {
  console.log('PAM Greeting Audio Generator');
  console.log('============================\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable not set');
    console.error('Usage: OPENAI_API_KEY=sk-xxx node scripts/generate-greetings.js');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}\n`);
  }

  console.log(`Voice: coral (warm, friendly female)`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const results = [];

  for (const greeting of GREETINGS) {
    try {
      const outputPath = await generateGreeting(greeting);
      results.push({ ...greeting, path: outputPath, success: true });
    } catch (error) {
      console.error(`  Error generating "${greeting.text}":`, error.message);
      results.push({ ...greeting, success: false, error: error.message });
    }
  }

  console.log('\n============================');
  console.log('Summary:');
  const successful = results.filter(r => r.success).length;
  console.log(`  Generated: ${successful}/${GREETINGS.length} files`);

  if (successful > 0) {
    console.log('\nNext steps:');
    console.log('  1. Update pamVoiceHybridService.ts to play local greeting on wake word');
    console.log('  2. Test with: npm run dev');
  }
}

main().catch(console.error);
