#!/usr/bin/env node

// Quick test script to verify the Render API connection
import { RenderClient } from './dist/render-client.js';

async function testConnection() {
  console.log('🧪 Testing Render MCP Server connection...\n');
  
  try {
    const client = new RenderClient();
    await client.validateConnection();
    
    const services = await client.getServices();
    console.log(`✅ Successfully connected to Render API`);
    console.log(`📊 Found ${services.length} services:`);
    
    for (const service of services) {
      const status = service.suspended === 'suspended' ? '⏸️  SUSPENDED' : '✅ ACTIVE';
      console.log(`   ${status} ${service.name} (${service.type})`);
      console.log(`      🔗 ${service.serviceDetails?.url || 'No URL'}`);
      console.log(`      📅 Updated: ${new Date(service.updatedAt).toLocaleDateString()}`);
    }
    
    console.log('\n🎉 Render MCP Server is ready for use!');
    console.log('\n🚀 Next steps:');
    console.log('1. Restart Claude Desktop completely (quit and reopen)');
    console.log('2. In Claude, try: "List my Render services"');
    console.log('3. Or try: "Check health of pam-backend"');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();