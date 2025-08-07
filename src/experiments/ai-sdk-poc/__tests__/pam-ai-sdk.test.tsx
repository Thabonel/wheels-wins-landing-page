/**
 * PAM AI SDK Component Tests
 * Phase 5: Testing and Validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PamAiSdk } from '@/components/PamAiSdk';
import { useChat } from '@ai-sdk/react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@ai-sdk/react');
vi.mock('@/context/AuthContext');
vi.mock('@/hooks/use-toast');
vi.mock('@/experiments/ai-sdk-poc/services/tripPlannerBridge');
vi.mock('@/experiments/ai-sdk-poc/services/routeParser');

describe('PamAiSdk Component', () => {
  const mockHandleSubmit = vi.fn();
  const mockHandleInputChange = vi.fn();
  const mockStop = vi.fn();
  const mockReload = vi.fn();
  const mockToast = vi.fn();

  const defaultChatState = {
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hi there! I\'m PAM, your AI travel assistant.',
      },
    ],
    input: '',
    handleInputChange: mockHandleInputChange,
    handleSubmit: mockHandleSubmit,
    isLoading: false,
    error: null,
    reload: mockReload,
    stop: mockStop,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useChat as any).mockReturnValue(defaultChatState);
    (useAuth as any).mockReturnValue({
      user: { user_metadata: { name: 'Test User' } },
    });
    (useToast as any).mockReturnValue({ toast: mockToast });

    // Mock speech synthesis
    global.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render in floating mode by default', () => {
      render(<PamAiSdk />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('rounded-full');
    });

    it('should render chat interface when opened', () => {
      render(<PamAiSdk />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('PAM - AI Travel Assistant')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask PAM anything/)).toBeInTheDocument();
    });

    it('should render in embedded mode', () => {
      render(<PamAiSdk mode="embedded" />);
      expect(screen.getByText('PAM - AI Travel Assistant')).toBeInTheDocument();
    });

    it('should render in fullscreen mode', () => {
      render(<PamAiSdk mode="fullscreen" />);
      const card = screen.getByText('PAM - AI Travel Assistant').closest('div');
      expect(card).toHaveClass('w-full', 'h-full');
    });
  });

  describe('Message Handling', () => {
    it('should display messages correctly', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello PAM' },
        { id: '2', role: 'assistant', content: 'Hello! How can I help?' },
      ];
      
      (useChat as any).mockReturnValue({
        ...defaultChatState,
        messages,
      });

      render(<PamAiSdk mode="embedded" />);
      
      expect(screen.getByText('Hello PAM')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    });

    it('should handle message submission', async () => {
      render(<PamAiSdk mode="embedded" />);
      
      const input = screen.getByPlaceholderText(/Ask PAM anything/);
      await userEvent.type(input, 'What is the weather?');
      
      const form = input.closest('form')!;
      fireEvent.submit(form);
      
      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('should show loading state', () => {
      (useChat as any).mockReturnValue({
        ...defaultChatState,
        isLoading: true,
      });

      render(<PamAiSdk mode="embedded" />);
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('should show error state', () => {
      (useChat as any).mockReturnValue({
        ...defaultChatState,
        error: new Error('Connection failed'),
      });

      render(<PamAiSdk mode="embedded" />);
      expect(screen.getByText(/Connection error/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Voice Features', () => {
    it('should toggle voice input', async () => {
      const mockRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
      };
      
      (global as any).webkitSpeechRecognition = vi.fn(() => mockRecognition);
      
      render(<PamAiSdk mode="embedded" />);
      
      const micButton = screen.getByRole('button', { name: /mic/i });
      fireEvent.click(micButton);
      
      expect(mockRecognition.start).toHaveBeenCalled();
      
      fireEvent.click(micButton);
      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    it('should toggle voice output', () => {
      render(<PamAiSdk mode="embedded" />);
      
      const volumeButton = screen.getByRole('button', { name: /volume/i });
      fireEvent.click(volumeButton);
      
      // Check that icon changes
      expect(volumeButton.querySelector('.lucide-volume-x')).toBeInTheDocument();
    });

    it('should speak assistant responses when voice enabled', async () => {
      const onFinish = vi.fn();
      
      (useChat as any).mockImplementation((config: any) => {
        // Call onFinish callback
        setTimeout(() => {
          config.onFinish({ content: 'Test response' });
        }, 100);
        
        return defaultChatState;
      });

      render(<PamAiSdk mode="embedded" />);
      
      await waitFor(() => {
        expect(global.speechSynthesis.speak).toHaveBeenCalled();
      });
    });
  });

  describe('Trip Planning Integration', () => {
    it('should show add to trip planner button when route available', async () => {
      const { extractTripPlan } = await import('@/experiments/ai-sdk-poc/services/routeParser');
      (extractTripPlan as any).mockReturnValue({
        origin: { name: 'New York' },
        destination: { name: 'Boston' },
      });

      (useChat as any).mockImplementation((config: any) => {
        setTimeout(() => {
          config.onFinish({ content: 'Route from New York to Boston' });
        }, 100);
        
        return defaultChatState;
      });

      render(<PamAiSdk mode="embedded" />);
      
      await waitFor(() => {
        const mapButton = screen.getByRole('button', { name: /trip planner/i });
        expect(mapButton).toBeInTheDocument();
      });
    });

    it('should handle adding route to trip planner', async () => {
      const { tripPlannerBridge } = await import('@/experiments/ai-sdk-poc/services/tripPlannerBridge');
      const mockAddRoute = vi.fn();
      (tripPlannerBridge as any).addRoute = mockAddRoute;

      const { extractTripPlan } = await import('@/experiments/ai-sdk-poc/services/routeParser');
      (extractTripPlan as any).mockReturnValue({
        origin: { name: 'New York' },
        destination: { name: 'Boston' },
        waypoints: [],
      });

      (useChat as any).mockImplementation((config: any) => {
        setTimeout(() => {
          config.onFinish({ content: 'Route planned' });
        }, 100);
        
        return defaultChatState;
      });

      render(<PamAiSdk mode="embedded" />);
      
      await waitFor(() => {
        const mapButton = screen.getByRole('button', { name: /trip planner/i });
        fireEvent.click(mapButton);
        
        expect(mockAddRoute).toHaveBeenCalledWith('New York', 'Boston', []);
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Route added to map',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (useChat as any).mockImplementation((config: any) => {
        config.onError(new Error('API Error'));
        return {
          ...defaultChatState,
          error: new Error('API Error'),
        };
      });

      render(<PamAiSdk mode="embedded" />);
      
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Connection Error',
          variant: 'destructive',
        })
      );
    });

    it('should handle speech recognition errors', () => {
      const mockRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
        onerror: null as any,
      };
      
      (global as any).webkitSpeechRecognition = vi.fn(() => mockRecognition);
      
      render(<PamAiSdk mode="embedded" />);
      
      // Trigger error
      if (mockRecognition.onerror) {
        mockRecognition.onerror({ error: 'network' });
      }
      
      // Should handle gracefully without crashing
      expect(screen.getByText('PAM - AI Travel Assistant')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PamAiSdk mode="embedded" />);
      
      expect(screen.getByRole('button', { name: /mic/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask PAM anything/)).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(<PamAiSdk mode="embedded" />);
      
      const input = screen.getByPlaceholderText(/Ask PAM anything/);
      input.focus();
      
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /mic/i }));
      
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /send/i }));
    });

    it('should announce loading states to screen readers', () => {
      (useChat as any).mockReturnValue({
        ...defaultChatState,
        isLoading: true,
      });

      render(<PamAiSdk mode="embedded" />);
      
      const loadingElement = screen.getByTestId('loading-indicator');
      expect(loadingElement).toHaveAttribute('aria-live', 'polite');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });
  });
});

/**
 * Integration test for full conversation flow
 */
describe('PAM AI SDK Integration', () => {
  it('should handle complete conversation flow', async () => {
    const user = userEvent.setup();
    const messages: any[] = [];
    
    (useChat as any).mockImplementation((config: any) => {
      return {
        messages,
        input: '',
        handleInputChange: (e: any) => {},
        handleSubmit: (e: any) => {
          e.preventDefault();
          messages.push({
            id: Date.now().toString(),
            role: 'user',
            content: 'Plan a trip to Yosemite',
          });
          
          // Simulate assistant response
          setTimeout(() => {
            messages.push({
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: 'I\'ll help you plan a trip to Yosemite!',
            });
            config.onFinish({
              content: 'I\'ll help you plan a trip to Yosemite!',
            });
          }, 100);
        },
        isLoading: false,
        error: null,
        reload: vi.fn(),
        stop: vi.fn(),
      };
    });

    render(<PamAiSdk mode="embedded" />);
    
    // Type and submit message
    const input = screen.getByPlaceholderText(/Ask PAM anything/);
    await user.type(input, 'Plan a trip to Yosemite');
    
    const form = input.closest('form')!;
    fireEvent.submit(form);
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Plan a trip to Yosemite')).toBeInTheDocument();
      expect(screen.getByText(/I'll help you plan a trip to Yosemite!/)).toBeInTheDocument();
    });
    
    // Verify TTS was triggered
    expect(global.speechSynthesis.speak).toHaveBeenCalled();
  });
});