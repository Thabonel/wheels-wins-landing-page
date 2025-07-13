import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '../test/utils/test-utils';
import PamVoice from '../components/voice/PamVoice';

// Mock the voice service
vi.mock('../lib/voiceService', () => ({
  pamVoiceService: {
    generateVoice: vi.fn(),
    isSupported: vi.fn().mockReturnValue(true),
  }
}));

// Mock useUserSettings to enable voice
vi.mock('../hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: {
      pam_preferences: {
        voice_enabled: true,
        proactive_suggestions: false
      }
    },
    updateSettings: vi.fn(),
    loading: false
  })
}));

// Mock audio elements
Object.defineProperty(window, 'HTMLAudioElement', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    src: '',
    currentTime: 0,
    duration: 0,
  })),
});

const { pamVoiceService } = await import('../lib/voiceService');
const mockedService = vi.mocked(pamVoiceService);

describe('PamVoice component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays audio when generation succeeds', async () => {
    mockedService.generateVoice.mockResolvedValue({
      audioUrl: 'blob:http://localhost/test',
      duration: 1,
      cached: false,
    } as any);

    const { container } = render(<PamVoice text="Hello" autoPlay />);

    await waitFor(() => {
      const audio = container.querySelector('audio') as HTMLAudioElement;
      expect(audio).toBeDefined();
    }, { timeout: 3000 });
  });

  it('shows error when generation fails', async () => {
    mockedService.generateVoice.mockRejectedValue(new Error('failure'));
    
    const { findByText } = render(<PamVoice text="Hello" autoPlay />);
    
    const err = await findByText(/Voice unavailable/i, {}, { timeout: 3000 });
    expect(err).toBeTruthy();
  });

  it('renders without crashing when no text provided', () => {
    expect(() => render(<PamVoice text="" />)).not.toThrow();
  });
});
