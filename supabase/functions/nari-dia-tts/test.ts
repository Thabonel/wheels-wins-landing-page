#!/usr/bin/env deno run --allow-net --allow-env

/**
 * Test script for Nari Labs Dia TTS Edge Function
 * 
 * Usage:
 *   deno run --allow-net --allow-env test.ts
 * 
 * Prerequisites:
 *   - Set NARI_LABS_DIA_API_KEY environment variable
 *   - Supabase Edge Function deployed locally or in production
 */

const FUNCTION_URL = Deno.env.get('SUPABASE_FUNCTION_URL') || 'http://localhost:54321/functions/v1/nari-dia-tts';
const API_KEY = Deno.env.get('NARI_LABS_DIA_API_KEY');

interface TestCase {
  name: string;
  request: any;
  expectSuccess: boolean;
  description: string;
}

const testCases: TestCase[] = [
  {
    name: 'Basic Monologue',
    request: {
      text: "Hello there! Welcome to our travel planning assistant.",
      voice_type: "monologue",
      format: "wav"
    },
    expectSuccess: true,
    description: 'Test basic text-to-speech generation'
  },
  {
    name: 'Dialogue with Speaker Tags',
    request: {
      text: "[S1] How was your trip? [S2] It was amazing! (laughs)",
      voice_type: "dialogue",
      format: "wav"
    },
    expectSuccess: true,
    description: 'Test dialogue generation with speaker tags and emotions'
  },
  {
    name: 'Nonverbal Cues',
    request: {
      text: "Well, that's interesting! (sighs) Let me think about this. (clears throat)",
      voice_type: "monologue",
      format: "mp3"
    },
    expectSuccess: true,
    description: 'Test nonverbal vocal cues recognition'
  },
  {
    name: 'Empty Text Error',
    request: {
      text: "",
      voice_type: "monologue"
    },
    expectSuccess: false,
    description: 'Test validation for empty text'
  },
  {
    name: 'Long Text Error',
    request: {
      text: "A".repeat(6000), // Exceeds 5000 character limit
      voice_type: "monologue"
    },
    expectSuccess: false,
    description: 'Test validation for text length limit'
  },
  {
    name: 'Invalid JSON',
    request: "invalid json",
    expectSuccess: false,
    description: 'Test handling of invalid JSON'
  }
];

async function runTest(testCase: TestCase): Promise<void> {
  console.log(`\n🧪 Running test: ${testCase.name}`);
  console.log(`📋 Description: ${testCase.description}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: typeof testCase.request === 'string' 
        ? testCase.request 
        : JSON.stringify(testCase.request)
    });
    
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }
    
    console.log(`⏱️  Response time: ${responseTime}ms`);
    console.log(`🌐 Status: ${response.status} ${response.statusText}`);
    
    // Check if result matches expectation
    const success = response.ok;
    const expectedResult = testCase.expectSuccess;
    
    if (success === expectedResult) {
      console.log(`✅ Test PASSED`);
      
      if (success && responseData.audio) {
        console.log(`📊 Audio size: ${responseData.audio.length} bytes`);
        console.log(`🎵 Format: ${responseData.format}`);
        console.log(`⏰ Duration: ${responseData.duration}s`);
        if (responseData.metadata) {
          console.log(`🔧 Processing time: ${responseData.metadata.processing_time}ms`);
          console.log(`📝 Text length: ${responseData.metadata.text_length} chars`);
        }
      } else if (!success) {
        console.log(`❌ Expected error: ${responseData.error}`);
      }
    } else {
      console.log(`❌ Test FAILED`);
      console.log(`Expected success: ${expectedResult}, got: ${success}`);
      console.log(`Response:`, responseData);
    }
    
    // Log response headers for debugging
    const processingTime = response.headers.get('X-Processing-Time');
    const audioSize = response.headers.get('X-Audio-Size');
    if (processingTime) console.log(`🔧 Server processing time: ${processingTime}ms`);
    if (audioSize) console.log(`📦 Audio size header: ${audioSize} bytes`);
    
  } catch (error) {
    console.log(`❌ Test FAILED with error:`);
    console.error(error);
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Nari Labs Dia TTS Edge Function Tests');
  console.log(`🌐 Function URL: ${FUNCTION_URL}`);
  
  if (!API_KEY) {
    console.error('❌ NARI_LABS_DIA_API_KEY environment variable not set');
    console.log('Set it with: export NARI_LABS_DIA_API_KEY=SG_your_key_here');
    Deno.exit(1);
  }
  
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  
  // Test CORS preflight
  console.log('\n🔧 Testing CORS preflight...');
  try {
    const optionsResponse = await fetch(FUNCTION_URL, {
      method: 'OPTIONS'
    });
    console.log(`✅ OPTIONS request: ${optionsResponse.status}`);
  } catch (error) {
    console.log(`❌ OPTIONS request failed:`, error);
  }
  
  // Run all test cases
  for (const testCase of testCases) {
    await runTest(testCase);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🏁 All tests completed!');
}

// Performance test
async function runPerformanceTest(): Promise<void> {
  console.log('\n🏃 Running performance test...');
  
  const testText = "Hello, this is a performance test for the TTS system. How fast can we generate speech?";
  const iterations = 5;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          voice_type: "monologue",
          format: "wav"
        })
      });
      
      if (response.ok) {
        await response.json(); // Ensure full response is received
        const responseTime = Date.now() - startTime;
        times.push(responseTime);
        console.log(`⚡ Request ${i + 1}: ${responseTime}ms`);
      } else {
        console.log(`❌ Request ${i + 1} failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Request ${i + 1} error:`, error);
    }
    
    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log('\n📊 Performance Results:');
    console.log(`Average: ${avgTime.toFixed(2)}ms`);
    console.log(`Min: ${minTime}ms`);
    console.log(`Max: ${maxTime}ms`);
  }
}

// Main execution
if (import.meta.main) {
  await runAllTests();
  
  // Ask if user wants to run performance test
  const runPerf = confirm('\nRun performance test? (This will make 5 additional requests)');
  if (runPerf) {
    await runPerformanceTest();
  }
  
  console.log('\n✨ Testing complete!');
}