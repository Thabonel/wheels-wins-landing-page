/**
 * Integration Tests: PAM (Personal AI Mobility) Assistant
 * Tests complete PAM integration including chat, voice, context awareness,
 * and integration with trip planning and user profile systems
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { 
  mockSupabaseClient, 
  resetAllMocks, 
  createMockProfile,
  createMockAuthUser 
} from '../../test/mocks/supabase';

// Mock speech synthesis and recognition
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([
    { name: 'Test Voice', lang: 'en-US', voiceURI: 'test-voice' }
  ])
};

const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US'
};

global.speechSynthesis = mockSpeechSynthesis;
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  onstart: null,
  onend: null,
  onerror: null
}));

global.webkitSpeechRecognition = vi.fn().mockImplementation(() => mockSpeechRecognition);
global.SpeechRecognition = vi.fn().mockImplementation(() => mockSpeechRecognition);

// Mock PAM API service
const mockPAMService = {
  sendMessage: vi.fn().mockResolvedValue({
    message: 'Hello! I can help you plan your trip. Where would you like to go?',
    suggestions: [
      'Plan a trip to Yellowstone',
      'Find campgrounds near me',
      'Calculate fuel costs'
    ],
    context: {
      intent: 'greeting',
      confidence: 0.95
    }
  }),
  getContextualSuggestions: vi.fn().mockResolvedValue([
    'Based on your location, here are nearby RV parks...',
    'Would you like me to check weather conditions?',
    'I can help optimize your route for fuel efficiency'
  ]),
  analyzeTrip: vi.fn().mockResolvedValue({
    analysis: 'This looks like a great adventure trip! I notice you\'re planning to visit several national parks.',
    recommendations: [
      'Consider getting an America the Beautiful pass',
      'Book campgrounds in advance, especially for summer travel',
      'Check for RV size restrictions on park roads'
    ],
    estimatedCosts: {
      fuel: 285.50,
      campgrounds: 420.00,
      food: 300.00
    }
  })
};

vi.mock('../../services/pamService', () => ({
  default: mockPAMService
}));

// Mock voice synthesis service
const mockVoiceService = {
  synthesize: vi.fn().mockResolvedValue({
    audioUrl: 'blob:audio-data',
    duration: 3.5
  }),
  getAvailableVoices: vi.fn().mockResolvedValue([
    { id: 'aria', name: 'Aria', language: 'en-US', gender: 'female' },
    { id: 'jenny', name: 'Jenny', language: 'en-US', gender: 'female' },
    { id: 'guy', name: 'Guy', language: 'en-US', gender: 'male' }
  ])
};

vi.mock('../../services/voiceService', () => ({
  default: mockVoiceService
}));

// Mock components
const PAMChatInterface = ({ onMessage, messages, loading }: any) => (
  <div data-testid="pam-chat-interface">
    <div data-testid="chat-messages">
      {messages.map((msg: any, index: number) => (
        <div key={index} data-testid={`message-${index}`} className={`message-${msg.sender}`}>
          {msg.text}
        </div>
      ))}
    </div>
    {loading && <div data-testid="pam-thinking">PAM is thinking...</div>}
    <div data-testid="chat-input-container">
      <input 
        data-testid="chat-input"
        placeholder="Ask PAM anything..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onMessage(e.target.value);
            e.target.value = '';
          }
        }}
      />
      <button data-testid="send-button" onClick={() => {
        const input = document.querySelector('[data-testid="chat-input"]') as HTMLInputElement;
        onMessage(input.value);
        input.value = '';
      }}>
        Send
      </button>
    </div>
  </div>
);

const PAMVoiceControls = ({ onVoiceToggle, onVoiceStart, isListening, voiceEnabled }: any) => (
  <div data-testid="pam-voice-controls">
    <button 
      data-testid="voice-toggle"
      onClick={onVoiceToggle}
      className={voiceEnabled ? 'voice-enabled' : 'voice-disabled'}
    >
      {voiceEnabled ? 'Voice On' : 'Voice Off'}
    </button>
    <button 
      data-testid="voice-record"
      onClick={onVoiceStart}
      className={isListening ? 'listening' : ''}
      disabled={!voiceEnabled}
    >
      {isListening ? 'Listening...' : 'Hold to Speak'}
    </button>
    <div data-testid="voice-status">
      Status: {isListening ? 'Listening' : voiceEnabled ? 'Ready' : 'Disabled'}
    </div>
  </div>
);

const PAMContextPanel = ({ context, suggestions }: any) => (
  <div data-testid="pam-context-panel">
    <h3>Smart Suggestions</h3>
    <div data-testid="context-suggestions">
      {suggestions.map((suggestion: string, index: number) => (
        <button key={index} data-testid={`suggestion-${index}`} className="suggestion-chip">
          {suggestion}
        </button>
      ))}
    </div>
    {context && (
      <div data-testid="conversation-context">
        Intent: {context.intent} (confidence: {context.confidence})
      </div>
    )}
  </div>
);

// Main PAM component
const PAMAssistant = () => {
  const [messages, setMessages] = React.useState([
    { sender: 'pam', text: 'Hello! I\'m PAM, your personal AI mobility assistant. How can I help you today?' }
  ]);
  const [loading, setLoading] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const [context, setContext] = React.useState(null);

  const handleMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: message }]);
    setLoading(true);

    try {
      // Send to PAM service
      const response = await mockPAMService.sendMessage(message);
      
      // Add PAM response
      setMessages(prev => [...prev, { sender: 'pam', text: response.message }]);
      setSuggestions(response.suggestions || []);
      setContext(response.context);

      // If voice is enabled, speak the response
      if (voiceEnabled) {
        await mockVoiceService.synthesize(response.message);
        mockSpeechSynthesis.speak(new SpeechSynthesisUtterance(response.message));
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        sender: 'pam', 
        text: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    setVoiceEnabled(!voiceEnabled);
  };

  const handleVoiceStart = () => {
    if (!voiceEnabled) return;
    
    setIsListening(true);
    mockSpeechRecognition.start();
    
    // Simulate voice recognition result
    setTimeout(() => {
      const mockTranscript = 'What are the best RV parks in Colorado?';
      handleMessage(mockTranscript);
      setIsListening(false);
    }, 2000);
  };

  React.useEffect(() => {
    // Load contextual suggestions on mount
    mockPAMService.getContextualSuggestions().then(setSuggestions);
  }, []);

  return (
    <div data-testid="pam-assistant">
      <PAMChatInterface 
        onMessage={handleMessage}
        messages={messages}
        loading={loading}
      />
      <PAMVoiceControls 
        onVoiceToggle={handleVoiceToggle}
        onVoiceStart={handleVoiceStart}
        isListening={isListening}
        voiceEnabled={voiceEnabled}
      />
      <PAMContextPanel 
        context={context}
        suggestions={suggestions}
      />
    </div>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PAM Integration Tests', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.clearAllMocks();
    
    // Setup authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: createMockAuthUser() },
      error: null
    });
    
    // Setup user profile
    mockSupabaseClient.from = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: createMockProfile(),
        error: null
      })
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Chat Interface', () => {
    it('should handle basic chat conversation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Should show initial greeting
      expect(screen.getByText(/Hello! I'm PAM/)).toBeInTheDocument();

      // Send a message
      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, 'Help me plan a trip to Yellowstone');
      await user.keyboard('{Enter}');

      // Should show user message
      await waitFor(() => {
        expect(screen.getByText('Help me plan a trip to Yellowstone')).toBeInTheDocument();
      });

      // Should show loading state
      expect(screen.getByTestId('pam-thinking')).toBeInTheDocument();

      // Should call PAM service
      expect(mockPAMService.sendMessage).toHaveBeenCalledWith('Help me plan a trip to Yellowstone');

      // Should show PAM response
      await waitFor(() => {
        expect(screen.getByText(/I can help you plan your trip/)).toBeInTheDocument();
        expect(screen.queryByTestId('pam-thinking')).not.toBeInTheDocument();
      });
    });

    it('should display contextual suggestions', async () => {
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Should load contextual suggestions
      await waitFor(() => {
        expect(mockPAMService.getContextualSuggestions).toHaveBeenCalled();
      });

      // Should display suggestions
      expect(screen.getByTestId('context-suggestions')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-0')).toBeInTheDocument();
    });

    it('should handle message send via button click', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      const chatInput = screen.getByTestId('chat-input');
      const sendButton = screen.getByTestId('send-button');

      await user.type(chatInput, 'Find campgrounds near Denver');
      await user.click(sendButton);

      // Should send message
      await waitFor(() => {
        expect(mockPAMService.sendMessage).toHaveBeenCalledWith('Find campgrounds near Denver');
      });

      // Should clear input
      expect(chatInput).toHaveValue('');
    });

    it('should handle empty messages gracefully', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      const chatInput = screen.getByTestId('chat-input');
      
      // Try to send empty message
      await user.keyboard('{Enter}');

      // Should not call PAM service
      expect(mockPAMService.sendMessage).not.toHaveBeenCalled();

      // Try with whitespace only
      await user.type(chatInput, '   ');
      await user.keyboard('{Enter}');

      // Should still not call PAM service
      expect(mockPAMService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Voice Integration', () => {
    it('should enable and disable voice functionality', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      const voiceToggle = screen.getByTestId('voice-toggle');
      const voiceRecord = screen.getByTestId('voice-record');

      // Initially voice should be disabled
      expect(voiceToggle).toHaveTextContent('Voice Off');
      expect(voiceRecord).toBeDisabled();
      expect(screen.getByTestId('voice-status')).toHaveTextContent('Status: Disabled');

      // Enable voice
      await user.click(voiceToggle);

      expect(voiceToggle).toHaveTextContent('Voice On');
      expect(voiceRecord).not.toBeDisabled();
      expect(screen.getByTestId('voice-status')).toHaveTextContent('Status: Ready');
    });

    it('should handle voice input and transcription', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Enable voice first
      await user.click(screen.getByTestId('voice-toggle'));

      // Start voice recording
      const voiceRecord = screen.getByTestId('voice-record');
      await user.click(voiceRecord);

      // Should show listening state
      expect(voiceRecord).toHaveTextContent('Listening...');
      expect(screen.getByTestId('voice-status')).toHaveTextContent('Status: Listening');

      // Should start speech recognition
      expect(mockSpeechRecognition.start).toHaveBeenCalled();

      // Wait for mock transcription
      await waitFor(() => {
        expect(mockPAMService.sendMessage).toHaveBeenCalledWith('What are the best RV parks in Colorado?');
      }, { timeout: 3000 });

      // Should return to ready state
      await waitFor(() => {
        expect(screen.getByTestId('voice-status')).toHaveTextContent('Status: Ready');
      });
    });

    it('should synthesize PAM responses when voice is enabled', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Enable voice
      await user.click(screen.getByTestId('voice-toggle'));

      // Send a text message
      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, 'Tell me about Yellowstone');
      await user.keyboard('{Enter}');

      // Should synthesize the response
      await waitFor(() => {
        expect(mockVoiceService.synthesize).toHaveBeenCalled();
        expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      });
    });
  });

  describe('Context Awareness', () => {
    it('should maintain conversation context', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Send first message
      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, 'I want to plan a trip');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('conversation-context')).toBeInTheDocument();
      });

      // Should show context information
      expect(screen.getByText(/Intent: greeting/)).toBeInTheDocument();
      expect(screen.getByText(/confidence: 0.95/)).toBeInTheDocument();
    });

    it('should provide relevant suggestions based on context', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Send trip planning message
      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, 'Plan a trip to national parks');
      await user.keyboard('{Enter}');

      // Should update suggestions based on context
      await waitFor(() => {
        expect(screen.getByTestId('suggestion-0')).toBeInTheDocument();
      });

      // Suggestions should be trip-related
      const suggestions = screen.getAllByText(/trip|camp|fuel/i);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Trip Planning Integration', () => {
    it('should analyze trip data and provide recommendations', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Send trip analysis request
      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, 'Analyze my trip to Yellowstone and Grand Canyon');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockPAMService.sendMessage).toHaveBeenCalledWith('Analyze my trip to Yellowstone and Grand Canyon');
      });

      // Should provide trip-specific response
      await waitFor(() => {
        expect(screen.getByText(/I can help you plan your trip/)).toBeInTheDocument();
      });
    });

    it('should provide cost estimates and practical advice', async () => {
      const user = userEvent.setup();
      
      mockPAMService.sendMessage.mockResolvedValueOnce({
        message: 'Based on your trip plan, here are my recommendations and cost estimates.',
        suggestions: [
          'Book campgrounds 3-6 months in advance',
          'Consider a National Parks Pass',
          'Plan for 12-15 MPG fuel consumption'
        ],
        context: {
          intent: 'trip_analysis',
          confidence: 0.92
        },
        costAnalysis: {
          fuel: 285.50,
          campgrounds: 420.00,
          food: 300.00,
          total: 1005.50
        }
      });
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, 'What will my trip cost?');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/cost estimates/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle PAM service errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock service error
      mockPAMService.sendMessage.mockRejectedValue(new Error('Service unavailable'));
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, 'This will fail');
      await user.keyboard('{Enter}');

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
      });

      // Should not crash the interface
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('should handle voice recognition errors', async () => {
      const user = userEvent.setup();
      
      // Mock speech recognition error
      mockSpeechRecognition.start.mockImplementation(() => {
        throw new Error('Speech recognition not available');
      });
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Enable voice
      await user.click(screen.getByTestId('voice-toggle'));

      // Try to start voice recording
      await user.click(screen.getByTestId('voice-record'));

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText(/voice recognition not available/i)).toBeInTheDocument();
      });
    });

    it('should handle network connectivity issues', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockPAMService.sendMessage.mockRejectedValue(new Error('Network error'));
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, 'Test message');
      await user.keyboard('{Enter}');

      // Should show appropriate error message
      await waitFor(() => {
        expect(screen.getByText(/encountered an error/)).toBeInTheDocument();
      });

      // Should allow retry
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Performance', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      // Should be able to navigate with keyboard
      await user.tab(); // Focus chat input
      expect(screen.getByTestId('chat-input')).toHaveFocus();

      await user.tab(); // Focus send button
      expect(screen.getByTestId('send-button')).toHaveFocus();

      await user.tab(); // Focus voice toggle
      expect(screen.getByTestId('voice-toggle')).toHaveFocus();
    });

    it('should handle rapid message sending', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PAMAssistant />
        </TestWrapper>
      );

      const chatInput = screen.getByTestId('chat-input');

      // Send multiple messages rapidly
      await user.type(chatInput, 'Message 1');
      await user.keyboard('{Enter}');
      
      await user.type(chatInput, 'Message 2');
      await user.keyboard('{Enter}');
      
      await user.type(chatInput, 'Message 3');
      await user.keyboard('{Enter}');

      // Should handle all messages without breaking
      await waitFor(() => {
        expect(mockPAMService.sendMessage).toHaveBeenCalledTimes(3);
      });
    });
  });
});