/**
 * Integration example for ClaudeService
 * This file demonstrates how to use the ClaudeService in a PAM component
 */

import claudeService, { type ChatMessage, type ChatOptions } from './claudeService';

/**
 * Example: Basic chat functionality
 */
export async function exampleBasicChat() {
  try {
    // Test connection first
    const isConnected = await claudeService.testConnection();
    if (!isConnected) {
      throw new Error('Claude service is not available');
    }

    // Send a simple message
    const response = await claudeService.sendMessage(
      "Hello! I'm testing the PAM integration.",
      "You are PAM, a helpful AI assistant for financial and travel planning."
    );

    console.log('Claude response:', response);
    return response;
  } catch (error) {
    console.error('Basic chat example failed:', error);
    throw error;
  }
}

/**
 * Example: Multi-turn conversation
 */
export async function exampleConversation() {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'I want to track my expenses better. Can you help?',
        timestamp: new Date()
      }
    ];

    // Get first response
    const response1 = await claudeService.chat(messages, {
      systemPrompt: 'You are PAM, a personal AI manager specializing in financial tracking and travel planning. Be helpful and concise.',
      maxTokens: 150
    });

    messages.push(response1);

    // Continue conversation
    messages.push({
      role: 'user',
      content: 'What categories should I use for my expenses?',
      timestamp: new Date()
    });

    const response2 = await claudeService.chat(messages);

    console.log('Conversation responses:', [response1.content, response2.content]);
    return [response1, response2];
  } catch (error) {
    console.error('Conversation example failed:', error);
    throw error;
  }
}

/**
 * Example: Streaming response
 */
export async function exampleStreaming() {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Explain how to create a budget in 5 steps.',
        timestamp: new Date()
      }
    ];

    let fullResponse = '';
    const chunks: string[] = [];

    await claudeService.chatStream(
      messages,
      (chunk) => {
        if (!chunk.isComplete) {
          chunks.push(chunk.content.slice(fullResponse.length));
          fullResponse = chunk.content;
          console.log('Streaming chunk:', chunks[chunks.length - 1]);
        } else {
          console.log('Streaming complete:', chunk.content);
          if (chunk.error) {
            console.error('Streaming error:', chunk.error);
          }
        }
      },
      {
        systemPrompt: 'You are PAM. Provide clear, step-by-step financial advice.',
        maxTokens: 300
      }
    );

    return { fullResponse, chunks };
  } catch (error) {
    console.error('Streaming example failed:', error);
    throw error;
  }
}

/**
 * Example: Error handling
 */
export async function exampleErrorHandling() {
  try {
    // This should work
    const validResponse = await claudeService.sendMessage('Hello');
    console.log('Valid response received:', `${validResponse.substring(0, 50)  }...`);

    // Test with empty message (should handle gracefully)
    try {
      await claudeService.sendMessage('');
    } catch (error) {
      console.log('Empty message handled correctly:', error.message);
    }

    return true;
  } catch (error) {
    console.error('Error handling example failed:', error);
    return false;
  }
}

/**
 * Example: Configuration and customization
 */
export async function exampleCustomization() {
  try {
    // Get current configuration
    const config = claudeService.getConfig();
    console.log('Current config:', config);

    // Update configuration
    claudeService.updateConfig({
      temperature: 0.1, // More deterministic
      maxTokens: 50     // Shorter responses
    });

    // Test with new config
    const response = await claudeService.sendMessage(
      'Give me one financial tip.',
      'Be very concise. One sentence only.'
    );

    console.log('Customized response:', response);

    // Restore original config
    claudeService.updateConfig(config);

    return response;
  } catch (error) {
    console.error('Customization example failed:', error);
    throw error;
  }
}

/**
 * Example: Tool preparation (for future PAM integration)
 */
export async function exampleWithToolsPreparation() {
  try {
    // Example of how tools would be structured for PAM
    const pamTools = [
      {
        name: 'getUserExpenses',
        description: 'Get user expense data for analysis',
        input_schema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            category: { type: 'string' }
          }
        }
      }
    ];

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'I want to analyze my spending from last month',
        timestamp: new Date()
      }
    ];

    // Note: This will work once tool execution is implemented
    const response = await claudeService.chat(messages, {
      tools: pamTools,
      systemPrompt: 'You are PAM. Use available tools to analyze user financial data.'
    });

    console.log('Tool-aware response:', response.content);
    return response;
  } catch (error) {
    console.error('Tools preparation example failed:', error);
    throw error;
  }
}

/**
 * Run all examples (for testing)
 */
export async function runAllExamples() {
  console.log('🚀 Running ClaudeService integration examples...\n');

  try {
    console.log('1. Testing basic chat...');
    await exampleBasicChat();

    console.log('\n2. Testing conversation...');
    await exampleConversation();

    console.log('\n3. Testing streaming...');
    await exampleStreaming();

    console.log('\n4. Testing error handling...');
    await exampleErrorHandling();

    console.log('\n5. Testing customization...');
    await exampleCustomization();

    console.log('\n6. Testing tools preparation...');
    await exampleWithToolsPreparation();

    console.log('\n✅ All examples completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    return false;
  }
}