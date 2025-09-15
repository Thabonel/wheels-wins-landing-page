import React, { useState } from 'react';
import { useTextToSpeech } from '@/hooks/voice/useTextToSpeech';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  SkipForward,
  Settings,
  Mic,
  AlertCircle
} from 'lucide-react';

export const TextToSpeechDemo: React.FC = () => {
  const [textToSpeak, setTextToSpeak] = useState('Hello! This is a demonstration of the text-to-speech functionality. You can adjust the rate, pitch, and volume settings to customize how I sound.');
  const [showSettings, setShowSettings] = useState(false);

  const tts = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  });

  const handleSpeak = () => {
    if (textToSpeak.trim()) {
      tts.speak(textToSpeak);
    }
  };

  const handleRateChange = (value: number[]) => {
    tts.updateOptions({ rate: value[0] });
  };

  const handlePitchChange = (value: number[]) => {
    tts.updateOptions({ pitch: value[0] });
  };

  const handleVolumeChange = (value: number[]) => {
    tts.updateOptions({ volume: value[0] });
  };

  const handleVoiceChange = (value: string) => {
    const voiceIndex = parseInt(value);
    if (!isNaN(voiceIndex)) {
      tts.setVoice(voiceIndex);
    }
  };

  const addToQueue = (text: string) => {
    tts.speak(text);
  };

  const presetTexts = [
    "This is a short test sentence.",
    "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet.",
    "Welcome to the Wheels & Wins platform! I'm PAM, your Personal AI Manager, and I'm here to help you with your financial goals and trip planning.",
    "Weather update: It's a beautiful sunny day with temperatures reaching 75 degrees Fahrenheit. Perfect weather for a road trip!",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris."
  ];

  if (!tts.isSupported) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="h-5 w-5" />
            Text-to-Speech Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Your browser doesn't support the Speech Synthesis API. Please try using a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Text-to-Speech Demo
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={tts.isSpeaking ? "default" : "secondary"}>
            {tts.isSpeaking ? "Speaking" : "Ready"}
          </Badge>
          {tts.isPaused && <Badge variant="outline">Paused</Badge>}
          {tts.queueLength > 0 && (
            <Badge variant="outline">
              Queue: {tts.queueLength}
            </Badge>
          )}
          <Badge variant="outline">
            Voices: {tts.availableVoices.length}
          </Badge>
        </div>

        {/* Current Text Display */}
        {tts.currentText && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <Label className="text-sm font-medium text-blue-800">Currently Speaking:</Label>
            <p className="text-sm text-blue-700 mt-1">{tts.currentText}</p>
          </div>
        )}

        {/* Text Input */}
        <div className="space-y-2">
          <Label htmlFor="text-input">Text to Speak</Label>
          <textarea
            id="text-input"
            value={textToSpeak}
            onChange={(e) => setTextToSpeak(e.target.value)}
            placeholder="Enter text to speak..."
            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-y"
            rows={4}
          />
          <p className="text-sm text-gray-500">
            Characters: {textToSpeak.length} {textToSpeak.length > 200 && "(will be truncated)"}
          </p>
        </div>

        {/* Main Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSpeak}
            disabled={!tts.canSpeak || !textToSpeak.trim()}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Speak
          </Button>

          <Button
            onClick={tts.pauseSpeaking}
            disabled={!tts.canPause}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>

          <Button
            onClick={tts.resumeSpeaking}
            disabled={!tts.canResume}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Resume
          </Button>

          <Button
            onClick={tts.stopSpeaking}
            disabled={!tts.isSpeaking && tts.queueLength === 0}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>

          <Button
            onClick={tts.clearQueue}
            disabled={tts.queueLength === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <SkipForward className="h-4 w-4" />
            Clear Queue
          </Button>

          <Button
            onClick={() => setShowSettings(!showSettings)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

        {/* Quick Test Buttons */}
        <div className="space-y-2">
          <Label>Quick Tests</Label>
          <div className="flex flex-wrap gap-2">
            {presetTexts.map((text, index) => (
              <Button
                key={index}
                onClick={() => addToQueue(text)}
                variant="outline"
                size="sm"
                disabled={!tts.isSupported}
              >
                Test {index + 1}
              </Button>
            ))}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Voice Settings
            </h3>

            {/* Voice Selection */}
            {tts.availableVoices.length > 0 && (
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select
                  value={tts.availableVoices.findIndex(v => v === tts.selectedVoice).toString()}
                  onValueChange={handleVoiceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {tts.availableVoices.map((voice, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {voice.name} ({voice.lang}) {voice.default && '(Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Rate Control */}
            <div className="space-y-2">
              <Label>Speed: {tts.currentOptions.rate.toFixed(1)}x</Label>
              <Slider
                value={[tts.currentOptions.rate]}
                onValueChange={handleRateChange}
                min={0.1}
                max={3.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>

            {/* Pitch Control */}
            <div className="space-y-2">
              <Label>Pitch: {tts.currentOptions.pitch.toFixed(1)}</Label>
              <Slider
                value={[tts.currentOptions.pitch]}
                onValueChange={handlePitchChange}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Low</span>
                <span>Normal</span>
                <span>High</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <Label>Volume: {Math.round(tts.currentOptions.volume * 100)}%</Label>
              <Slider
                value={[tts.currentOptions.volume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Quiet</span>
                <span>Normal</span>
                <span>Loud</span>
              </div>
            </div>

            {/* Reset Button */}
            <Button
              onClick={() => tts.updateOptions({ rate: 1.0, pitch: 1.0, volume: 0.8 })}
              variant="outline"
              size="sm"
            >
              Reset to Defaults
            </Button>
          </div>
        )}

        {/* Status Information */}
        <div className="text-sm text-gray-500 space-y-1">
          <p><strong>Browser Support:</strong> {tts.isSupported ? '✅ Supported' : '❌ Not Supported'}</p>
          <p><strong>Available Voices:</strong> {tts.availableVoices.length}</p>
          <p><strong>Selected Voice:</strong> {tts.selectedVoice?.name || 'None'}</p>
          {tts.selectedVoice && (
            <p><strong>Voice Language:</strong> {tts.selectedVoice.lang}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};