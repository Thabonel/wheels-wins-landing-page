#!/usr/bin/env node

/**
 * PAM Backend Status Checker
 * Tests PAM backend endpoints and services
 */

import https from 'https';
import WebSocket from 'ws';

// Configuration
const PAM_ENDPOINTS = {
  health: 'https://pam-backend.onrender.com/api/v1/health',
  chat: 'https://pam-backend.onrender.com/api/v1/pam/chat',
  websocket: 'wss://pam-backend.onrender.com/api/v1/pam/ws'
};

console.log('🤖 PAM Backend Status Check');
console.log('===========================\n');

async function checkPAMBackend() {
  const results = {
    health: false,
    chatEndpoint: false,
    websocket: false,
    responseTime: null
  };

  // Test 1: Health endpoint
  console.log('1. Checking health endpoint...');
  const startTime = Date.now();
  
  await new Promise((resolve) => {
    https.get(PAM_ENDPOINTS.health, (res) => {
      results.health = res.statusCode === 200 || res.statusCode === 404; // 404 if health endpoint doesn't exist
      results.responseTime = Date.now() - startTime;
      console.log(`   Status: ${res.statusCode} (${results.responseTime}ms)`);
      resolve();
    }).on('error', (err) => {
      console.log(`   Error: ${err.message}`);
      resolve();
    });
  });

  // Test 2: Chat endpoint (OPTIONS request to check CORS)
  console.log('\n2. Checking chat endpoint...');
  await new Promise((resolve) => {
    const options = {
      hostname: 'pam-backend.onrender.com',
      path: '/api/v1/pam/chat',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    };

    const req = https.request(options, (res) => {
      results.chatEndpoint = res.statusCode < 500;
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   CORS: ${res.headers['access-control-allow-origin'] || 'Not configured'}`);
      resolve();
    });

    req.on('error', (err) => {
      console.log(`   Error: ${err.message}`);
      resolve();
    });

    req.end();
  });

  // Test 3: WebSocket connection
  console.log('\n3. Checking WebSocket...');
  if (WebSocket) {
    await new Promise((resolve) => {
      try {
        const ws = new WebSocket(PAM_ENDPOINTS.websocket);
        
        const timeout = setTimeout(() => {
          console.log('   Timeout after 5 seconds');
          ws.close();
          resolve();
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          results.websocket = true;
          console.log('   Connected successfully!');
          ws.close();
          resolve();
        });

        ws.on('error', (err) => {
          clearTimeout(timeout);
          console.log(`   Error: ${err.message}`);
          resolve();
        });
      } catch (err) {
        console.log(`   Error: ${err.message}`);
        resolve();
      }
    });
  } else {
    console.log('   WebSocket module not available');
  }

  // Test 4: Send test message (without auth)
  console.log('\n4. Testing message sending (no auth)...');
  await new Promise((resolve) => {
    const postData = JSON.stringify({
      message: 'Test message from PAM backend checker',
      context: { test: true }
    });

    const options = {
      hostname: 'pam-backend.onrender.com',
      path: '/api/v1/pam/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('   Authentication required (expected)');
        } else if (res.statusCode === 200) {
          console.log('   Message accepted (unexpected - no auth!)');
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`   Error: ${err.message}`);
      resolve();
    });

    req.write(postData);
    req.end();
  });

  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`✅ Health Check: ${results.health ? 'ONLINE' : 'OFFLINE'}`);
  console.log(`✅ Chat Endpoint: ${results.chatEndpoint ? 'AVAILABLE' : 'UNAVAILABLE'}`);
  console.log(`✅ WebSocket: ${results.websocket ? 'CONNECTED' : 'FAILED'}`);
  if (results.responseTime) {
    console.log(`⏱️  Response Time: ${results.responseTime}ms`);
  }

  // Overall status
  const isOnline = results.health || results.chatEndpoint || results.websocket;
  console.log(`\n🔍 PAM Backend Status: ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);

  if (!isOnline) {
    console.log('\n⚠️  PAM backend appears to be offline or starting up.');
    console.log('This is expected if the backend is still deploying on Render.');
    console.log('Check: https://dashboard.render.com for deployment status');
  }

  return results;
}

// Run the check
checkPAMBackend().catch(console.error);