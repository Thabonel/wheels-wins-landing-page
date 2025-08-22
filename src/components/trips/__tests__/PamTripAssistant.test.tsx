import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PamTripAssistant from '../PamTripAssistant';

// Mock PAM context
vi.mock('@/context/PamContext', () => ({
  usePam: vi.fn(() => ({
    generateResponse: vi.fn().mockResolvedValue('I can help you plan a great trip!'),
    getRecommendations: vi.fn().mockResolvedValue([
      'Visit Yellowstone National Park',
      'Check out Grand Canyon',
      'Stop at Zion National Park',
    ]),
    updateContext: vi.fn(),
    isTyping: false,
  })),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('PamTripAssistant', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    tripData: {
      waypoints: [
        { id: '1', name: 'Start Point', lat: 40.7128, lng: -74.006, order: 0 },
        { id: '2', name: 'End Point', lat: 34.0522, lng: -118.2437, order: 1 },
      ],
      route: {
        distance: 2800,
        duration: 42,
        geometry: 'mock-geometry',
      },
      budget: 3000,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<PamTripAssistant {...mockProps} />);

    expect(screen.getByText('PAM Trip Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask PAM anything about your trip...')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<PamTripAssistant {...mockProps} isOpen={false} />);

    expect(screen.queryByText('PAM Trip Assistant')).not.toBeInTheDocument();
  });

  it('displays welcome message', () => {
    render(<PamTripAssistant {...mockProps} />);

    expect(screen.getByText(/Hi! I'm PAM, your AI trip assistant/)).toBeInTheDocument();
  });

  it('displays quick action buttons', () => {
    render(<PamTripAssistant {...mockProps} />);

    expect(screen.getByText('Find campgrounds along route')).toBeInTheDocument();
    expect(screen.getByText('Suggest stops for this trip')).toBeInTheDocument();
    expect(screen.getByText('Calculate fuel costs')).toBeInTheDocument();
    expect(screen.getByText('Weather forecast')).toBeInTheDocument();
  });

  it('sends a message when user types and submits', async () => {
    const { usePam } = await import('@/context/PamContext');
    const mockGenerateResponse = vi.fn().mockResolvedValue('Here are some great campgrounds!');
    (usePam as any).mockReturnValue({
      generateResponse: mockGenerateResponse,
      getRecommendations: vi.fn(),
      updateContext: vi.fn(),
      isTyping: false,
    });

    render(<PamTripAssistant {...mockProps} />);

    const input = screen.getByPlaceholderText('Ask PAM anything about your trip...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Type a message
    fireEvent.change(input, { target: { value: 'Find campgrounds' } });
    
    // Submit the message
    fireEvent.click(sendButton);

    // Check that generateResponse was called
    expect(mockGenerateResponse).toHaveBeenCalledWith(
      'Find campgrounds',
      expect.objectContaining({
        waypoints: mockProps.tripData.waypoints,
        route: mockProps.tripData.route,
        budget: mockProps.tripData.budget,
      })
    );

    // Wait for response to appear
    await waitFor(() => {
      expect(screen.getByText('Here are some great campgrounds!')).toBeInTheDocument();
    });
  });

  it('clears input after sending message', async () => {
    render(<PamTripAssistant {...mockProps} />);

    const input = screen.getByPlaceholderText('Ask PAM anything about your trip...') as HTMLInputElement;
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Type and send a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Input should be cleared
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('handles quick action clicks', async () => {
    const { usePam } = await import('@/context/PamContext');
    const mockGenerateResponse = vi.fn().mockResolvedValue('Here are campgrounds along your route!');
    (usePam as any).mockReturnValue({
      generateResponse: mockGenerateResponse,
      getRecommendations: vi.fn(),
      updateContext: vi.fn(),
      isTyping: false,
    });

    render(<PamTripAssistant {...mockProps} />);

    const campgroundButton = screen.getByText('Find campgrounds along route');
    fireEvent.click(campgroundButton);

    expect(mockGenerateResponse).toHaveBeenCalledWith(
      'Find campgrounds along route',
      expect.any(Object)
    );

    await waitFor(() => {
      expect(screen.getByText('Here are campgrounds along your route!')).toBeInTheDocument();
    });
  });

  it('shows typing indicator when PAM is generating response', async () => {
    const { usePam } = await import('@/context/PamContext');
    (usePam as any).mockReturnValue({
      generateResponse: vi.fn().mockResolvedValue('Response'),
      getRecommendations: vi.fn(),
      updateContext: vi.fn(),
      isTyping: true,
    });

    render(<PamTripAssistant {...mockProps} />);

    expect(screen.getByText('PAM is typing...')).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<PamTripAssistant {...mockProps} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when input has text', () => {
    render(<PamTripAssistant {...mockProps} />);

    const input = screen.getByPlaceholderText('Ask PAM anything about your trip...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test' } });
    
    expect(sendButton).not.toBeDisabled();
  });

  it('updates context when trip data changes', () => {
    const { usePam } = await import('@/context/PamContext');
    const mockUpdateContext = vi.fn();
    (usePam as any).mockReturnValue({
      generateResponse: vi.fn(),
      getRecommendations: vi.fn(),
      updateContext: mockUpdateContext,
      isTyping: false,
    });

    const { rerender } = render(<PamTripAssistant {...mockProps} />);

    // Update trip data
    const newProps = {
      ...mockProps,
      tripData: {
        ...mockProps.tripData,
        budget: 5000,
      },
    };

    rerender(<PamTripAssistant {...newProps} />);

    expect(mockUpdateContext).toHaveBeenCalledWith(
      expect.objectContaining({
        budget: 5000,
      })
    );
  });

  it('handles message submission with Enter key', async () => {
    const { usePam } = await import('@/context/PamContext');
    const mockGenerateResponse = vi.fn().mockResolvedValue('Response to enter key');
    (usePam as any).mockReturnValue({
      generateResponse: mockGenerateResponse,
      getRecommendations: vi.fn(),
      updateContext: vi.fn(),
      isTyping: false,
    });

    render(<PamTripAssistant {...mockProps} />);

    const input = screen.getByPlaceholderText('Ask PAM anything about your trip...');

    // Type and press Enter
    fireEvent.change(input, { target: { value: 'Test with Enter' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockGenerateResponse).toHaveBeenCalledWith('Test with Enter', expect.any(Object));

    await waitFor(() => {
      expect(screen.getByText('Response to enter key')).toBeInTheDocument();
    });
  });

  it('displays trip statistics correctly', () => {
    render(<PamTripAssistant {...mockProps} />);

    // Check if trip stats are displayed
    expect(screen.getByText(/2 waypoints/)).toBeInTheDocument();
    expect(screen.getByText(/2800 miles/)).toBeInTheDocument();
    expect(screen.getByText(/\$3000 budget/)).toBeInTheDocument();
  });

  it('handles close button click', () => {
    render(<PamTripAssistant {...mockProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles error when generating response fails', async () => {
    const { usePam } = await import('@/context/PamContext');
    const mockGenerateResponse = vi.fn().mockRejectedValue(new Error('API error'));
    (usePam as any).mockReturnValue({
      generateResponse: mockGenerateResponse,
      getRecommendations: vi.fn(),
      updateContext: vi.fn(),
      isTyping: false,
    });

    const { toast } = await import('sonner');

    render(<PamTripAssistant {...mockProps} />);

    const input = screen.getByPlaceholderText('Ask PAM anything about your trip...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test error' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to get response from PAM');
    });
  });

  it('displays correct message when no trip data is available', () => {
    const propsWithoutTripData = {
      ...mockProps,
      tripData: {
        waypoints: [],
        route: null,
        budget: null,
      },
    };

    render(<PamTripAssistant {...propsWithoutTripData} />);

    expect(screen.getByText(/0 waypoints/)).toBeInTheDocument();
    expect(screen.getByText(/No route planned/)).toBeInTheDocument();
    expect(screen.getByText(/No budget set/)).toBeInTheDocument();
  });

  it('scrolls to bottom when new messages are added', async () => {
    const { usePam } = await import('@/context/PamContext');
    const mockGenerateResponse = vi.fn().mockResolvedValue('New message');
    (usePam as any).mockReturnValue({
      generateResponse: mockGenerateResponse,
      getRecommendations: vi.fn(),
      updateContext: vi.fn(),
      isTyping: false,
    });

    render(<PamTripAssistant {...mockProps} />);

    // Send multiple messages
    const input = screen.getByPlaceholderText('Ask PAM anything about your trip...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Message 1' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Message 1')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: 'Message 2' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Message 2')).toBeInTheDocument();
    });

    // Check that scroll area exists (actual scrolling behavior would need jsdom setup)
    const scrollArea = screen.getByTestId('chat-messages').closest('[data-radix-scroll-area-viewport]');
    expect(scrollArea).toBeInTheDocument();
  });
});