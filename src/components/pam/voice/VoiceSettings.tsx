import React, { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Mic, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VoiceSettingsProps {
  className?: string;
  onVoiceInputChange?: (enabled: boolean) => void;
  onVoiceOutputChange?: (enabled: boolean) => void;
}

interface VoiceCapabilities {
  speechRecognition: boolean;
  speechSynthesis: boolean;
}

const STORAGE_KEYS = {
  voiceInput: 'pam-voice-input-enabled',
  voiceOutput: 'pam-voice-output-enabled'
} as const;

// Detect browser voice capabilities
const detectVoiceCapabilities = (): VoiceCapabilities => {
  if (typeof window === 'undefined') {
    return { speechRecognition: false, speechSynthesis: false };
  }

  // Check Speech Recognition support
  const speechRecognition = !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition
  );

  // Check Speech Synthesis support
  const speechSynthesis = !!(
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );

  return { speechRecognition, speechSynthesis };
};

// Get setting from localStorage with fallback
const getSetting = (key: string, fallback: boolean = false): boolean => {
  if (typeof window === 'undefined') return fallback;
  
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage:`, error);
    return fallback;
  }
};

// Save setting to localStorage
const setSetting = (key: string, value: boolean): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
};

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  className,
  onVoiceInputChange,
  onVoiceOutputChange
}) => {
  // Detect capabilities once on mount
  const [capabilities] = useState<VoiceCapabilities>(() => detectVoiceCapabilities());

  // Initialize settings from localStorage
  const [voiceInputEnabled, setVoiceInputEnabled] = useState<boolean>(() => 
    getSetting(STORAGE_KEYS.voiceInput, capabilities.speechRecognition)
  );
  
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState<boolean>(() => 
    getSetting(STORAGE_KEYS.voiceOutput, capabilities.speechSynthesis)
  );

  // Handle voice input toggle
  const handleVoiceInputChange = useCallback((checked: boolean) => {
    setVoiceInputEnabled(checked);
    setSetting(STORAGE_KEYS.voiceInput, checked);
    onVoiceInputChange?.(checked);
  }, [onVoiceInputChange]);

  // Handle voice output toggle
  const handleVoiceOutputChange = useCallback((checked: boolean) => {
    setVoiceOutputEnabled(checked);
    setSetting(STORAGE_KEYS.voiceOutput, checked);
    onVoiceOutputChange?.(checked);
  }, [onVoiceOutputChange]);

  // Update settings from localStorage on focus (in case changed in another tab)
  const handleWindowFocus = useCallback(() => {
    const currentInput = getSetting(STORAGE_KEYS.voiceInput, capabilities.speechRecognition);
    const currentOutput = getSetting(STORAGE_KEYS.voiceOutput, capabilities.speechSynthesis);
    
    if (currentInput !== voiceInputEnabled) {
      setVoiceInputEnabled(currentInput);
      onVoiceInputChange?.(currentInput);
    }
    
    if (currentOutput !== voiceOutputEnabled) {
      setVoiceOutputEnabled(currentOutput);
      onVoiceOutputChange?.(currentOutput);
    }
  }, [capabilities, voiceInputEnabled, voiceOutputEnabled, onVoiceInputChange, onVoiceOutputChange]);

  // Listen for window focus to sync settings
  useEffect(() => {
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [handleWindowFocus]);

  // Hide component if no voice features are supported
  if (!capabilities.speechRecognition && !capabilities.speechSynthesis) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center justify-center gap-6 px-4 py-2 bg-muted/50 border-b text-sm',
      className
    )}>
      {/* Voice Input Setting */}
      {capabilities.speechRecognition && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="voice-input-enabled"
            checked={voiceInputEnabled}
            onCheckedChange={handleVoiceInputChange}
            aria-describedby="voice-input-description"
          />
          <Label
            htmlFor="voice-input-enabled"
            className="flex items-center gap-1.5 cursor-pointer text-xs font-medium"
          >
            <Mic size={14} />
            Enable Voice Input
          </Label>
        </div>
      )}

      {/* Voice Output Setting */}
      {capabilities.speechSynthesis && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="voice-output-enabled"
            checked={voiceOutputEnabled}
            onCheckedChange={handleVoiceOutputChange}
            aria-describedby="voice-output-description"
          />
          <Label
            htmlFor="voice-output-enabled"
            className="flex items-center gap-1.5 cursor-pointer text-xs font-medium"
          >
            <Volume2 size={14} />
            Enable Voice Output
          </Label>
        </div>
      )}

      {/* Hidden descriptions for accessibility */}
      <div className="sr-only">
        <div id="voice-input-description">
          Toggle voice input to speak commands instead of typing
        </div>
        <div id="voice-output-description">
          Toggle voice output to hear PAM's responses spoken aloud
        </div>
      </div>
    </div>
  );
};