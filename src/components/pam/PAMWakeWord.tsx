/**
 * PAM Wake Word Detection Component
 *
 * Listens for "Hey PAM" wake word using browser's Web Speech API.
 * Ultra-simple, no external dependencies, works offline after first load.
 */

import { useEffect, useState, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { initializeVoiceService, getVoiceService } from '@/services/pamVoiceService';
import { toast } from 'sonner';

interface PAMWakeWordProps {
  apiKey: string;
  onWakeWordDetected?: () => void;
  enabled?: boolean;
}

export function PAMWakeWord({ apiKey, onWakeWordDetected, enabled = true }: PAMWakeWordProps) {
  const [isListening, setIsListening] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  /**
   * Initialize speech recognition
   */
  useEffect(() => {
    if (!enabled) return;

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      logger.warn('[WakeWord] Speech recognition not supported in this browser');
      toast.error('Voice wake word not supported in this browser');
      return;
    }

    // Create recognition instance
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true; // Keep listening
    recognitionInstance.interimResults = false; // Only final results
    recognitionInstance.lang = 'en-US';

    // Handle recognition results
    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();

      logger.info('[WakeWord] Heard:', transcript);

      // Check for wake word - any greeting + "pam" should trigger
      const pamGreetings = [
        'hey pam',
        'hi pam',
        'hello pam',
        'good morning pam',
        'good afternoon pam',
        'good evening pam',
        'morning pam',
        'evening pam',
        'yo pam',
        'ok pam',
        'okay pam'
      ];

      const wakeWordDetected = pamGreetings.some(greeting => transcript.includes(greeting));

      if (wakeWordDetected) {
        logger.info('[WakeWord] Wake word detected!');
        handleWakeWord();
      }
    };

    // Handle errors
    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      logger.error('[WakeWord] Recognition error:', event.error);

      if (event.error === 'no-speech') {
        // Ignore no-speech errors (normal when user is silent)
        return;
      }

      toast.error(`Wake word detection error: ${event.error}`);
    };

    // Handle end (restart if still enabled)
    recognitionInstance.onend = () => {
      if (isListening) {
        logger.info('[WakeWord] Restarting recognition...');
        try {
          recognitionInstance.start();
        } catch (error) {
          logger.error('[WakeWord] Failed to restart:', error);
        }
      }
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [enabled]);

  /**
   * Handle wake word detection
   */
  const handleWakeWord = useCallback(async () => {
    try {
      logger.info('[WakeWord] Activating PAM voice...');

      // Play chime sound (TODO: Add audio file)
      toast.success('PAM is listening...');

      // Initialize voice service if not already done
      const voiceService = initializeVoiceService(apiKey);

      // Start voice session
      await voiceService.start();
      setIsVoiceActive(true);

      // Notify parent component
      onWakeWordDetected?.();

      // Stop wake word detection while voice is active
      setIsListening(false);

      logger.info('[WakeWord] Voice session started');
    } catch (error) {
      logger.error('[WakeWord] Failed to start voice session:', error);
      toast.error('Failed to start voice session');
    }
  }, [apiKey, onWakeWordDetected]);

  /**
   * Start listening for wake word
   */
  const startListening = useCallback(() => {
    if (!recognition) {
      toast.error('Speech recognition not available');
      return;
    }

    try {
      recognition.start();
      setIsListening(true);
      logger.info('[WakeWord] Started listening for PAM wake words');
      toast.success('Wake word detection active');
    } catch (error) {
      logger.error('[WakeWord] Failed to start listening:', error);
      toast.error('Failed to start wake word detection');
    }
  }, [recognition]);

  /**
   * Stop listening for wake word
   */
  const stopListening = useCallback(() => {
    if (!recognition) return;

    try {
      recognition.stop();
      setIsListening(false);
      logger.info('[WakeWord] Stopped listening');
      toast.info('Wake word detection stopped');
    } catch (error) {
      logger.error('[WakeWord] Failed to stop listening:', error);
    }
  }, [recognition]);

  /**
   * Stop voice session
   */
  const stopVoice = useCallback(async () => {
    try {
      const voiceService = getVoiceService();
      await voiceService.stop();
      setIsVoiceActive(false);

      // Resume wake word detection
      startListening();

      logger.info('[WakeWord] Voice session stopped');
      toast.info('Voice session ended');
    } catch (error) {
      logger.error('[WakeWord] Failed to stop voice:', error);
    }
  }, [startListening]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Wake Word Toggle */}
      {!isVoiceActive && (
        <Button
          onClick={isListening ? stopListening : startListening}
          variant={isListening ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
        >
          {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          {isListening ? 'Listening for PAM' : 'Enable Wake Word'}
        </Button>
      )}

      {/* Voice Active Indicator */}
      {isVoiceActive && (
        <Button
          onClick={stopVoice}
          variant="destructive"
          size="sm"
          className="gap-2 animate-pulse"
        >
          <Mic className="w-4 h-4" />
          PAM is listening - Click to stop
        </Button>
      )}

      {/* Status Text */}
      {isListening && !isVoiceActive && (
        <span className="text-sm text-muted-foreground">
          Say "Hey PAM", "Hi PAM", or "Good morning PAM"
        </span>
      )}
    </div>
  );
}
