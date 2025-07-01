import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import PamVoice from '../components/voice/PamVoice';
import { pamVoiceService } from '../lib/voiceService';

vi.mock('../lib/voiceService');

const mockedService = vi.mocked(pamVoiceService);

describe('PamVoice component', () => {
  it('plays audio when generation succeeds', async () => {
    mockedService.generateVoice.mockResolvedValue({
      audioUrl: 'blob:http://localhost/test',
      duration: 1,
      cached: false,
    } as any);

    const { container } = render(<PamVoice text="Hello" autoPlay />);

    await waitFor(() => {
      const audio = container.querySelector('audio') as HTMLAudioElement;
      expect(audio.src).toContain('blob:');
    });
  });

  it('shows error when generation fails', async () => {
    mockedService.generateVoice.mockRejectedValue(new Error('failure'));
    const { findByText } = render(<PamVoice text="Hello" autoPlay />);
    const err = await findByText(/Voice unavailable/i);
    expect(err).toBeTruthy();
  });
});
