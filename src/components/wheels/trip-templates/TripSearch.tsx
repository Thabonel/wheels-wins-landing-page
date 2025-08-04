import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripSearchProps {
  value: string;
  onChange: (value: string) => void;
  onPAMSearch?: (query: string) => void;
}

export default function TripSearch({ value, onChange }: TripSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const handleVoiceSearch = () => {
    if (!voiceSupported) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onChange(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <div className="relative">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search destinations, activities, or RV parks..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-10 pr-12 h-12 text-base"
          />
          {voiceSupported && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleVoiceSearch}
              className={cn(
                "absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0",
                isListening && "text-red-600 animate-pulse"
              )}
              title="Voice search"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}