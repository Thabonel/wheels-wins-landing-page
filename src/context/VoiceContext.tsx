
import React, { createContext, useContext, useState, useCallback } from 'react';
import { pamVoiceService, VoiceGenerationOptions } from '@/lib/voiceService';

interface VoiceContextType {
  isVoiceEnabled: boolean;
  toggleVoice: () => void;
  speakText: (options: VoiceGenerationOptions) => Promise<void>;
  isGenerating: boolean;
  voiceQueue: string[];
  clearQueue: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceQueue, setVoiceQueue] = useState<string[]>([]);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => !prev);
  }, []);

  const speakText = useCallback(async (options: VoiceGenerationOptions) => {
    if (!isVoiceEnabled) return;

    setIsGenerating(true);
    setVoiceQueue(prev => [...prev, options.text]);

    try {
      await pamVoiceService.generateVoice(options);
    } catch (error) {
      console.error('Voice generation failed:', error);
    } finally {
      setIsGenerating(false);
      setVoiceQueue(prev => prev.filter(text => text !== options.text));
    }
  }, [isVoiceEnabled]);

  const clearQueue = useCallback(() => {
    setVoiceQueue([]);
  }, []);

  return (
    <VoiceContext.Provider value={{
      isVoiceEnabled,
      toggleVoice,
      speakText,
      isGenerating,
      voiceQueue,
      clearQueue
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
