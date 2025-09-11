#!/usr/bin/env node

// Test connection to Render API
import { RenderClient } from './dist/render-client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log('>� Testing Render MCP Server Connection...');
  console.log('=' .repeat(50));
  
  try {
    // Check if API key is configured
    if (!process.env.RENDER_API_KEY) {
      console.error('L RENDER_API_KEY environment variable not set');
      console.log('=� Make sure you have a .env file with your Render API key');
      process.exit(1);
    }
    
    console.log(' API Key loaded:', process.env.RENDER_API_KEY.substring(0, 10) + '...');
    
    // Initialize Render client
    const renderClient = new RenderClient(process.env.RENDER_API_KEY);
    
    // Test API connection by listing services
    console.log('= Testing API connection...');
    const services = await renderClient.getServices();
    
    console.log(` Connection successful! Found ${services.length} services:`);
    console.log('');
    
    // Display services
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} (${service.type})`);
      console.log(`   URL: ${service.serviceDetails?.url || 'N/A'}`);
      console.log(`   Status: ${service.serviceDetails?.buildCommand ? '' : 'S'} ${service.serviceDetails?.buildCommand || 'No build command'}`);
      console.log(`   Updated: ${new Date(service.updatedAt).toLocaleDateString()}`);
      console.log('');
    });
    
    console.log('<� Render MCP Server is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart Claude Desktop completely (Cmd+Q then reopen)');
    console.log('2. Try commands like "List my Render services" in a new conversation');
    console.log('');
    
  } catch (error) {
    console.error('L Connection test failed:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Verify your API key is correct in .env file');
    console.log('2. Check your internet connection');
    console.log('3. Ensure the API key has proper permissions');
    process.exit(1);
  }
}

testConnection();