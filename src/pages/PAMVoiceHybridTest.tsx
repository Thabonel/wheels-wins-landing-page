/**
 * Test page for PAM Hybrid Voice System
 *
 * Tests the production-ready hybrid architecture:
 * - OpenAI Realtime API for voice I/O (speech-to-text + text-to-speech)
 * - Claude Sonnet 4.5 for reasoning and tool execution
 * - WebSocket bridge connecting the two systems
 *
 * This is the new recommended voice implementation for PAM.
 */

import React from 'react';
import { PAMVoiceHybrid } from '@/components/pam/PAMVoiceHybrid';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PAMVoiceHybridTest() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">PAM Hybrid Voice System</h1>
        <p className="text-muted-foreground">
          Production-ready voice assistant powered by OpenAI Realtime API + Claude Sonnet 4.5
        </p>
      </div>

      {/* System Status */}
      <Card className="p-4 mb-6 bg-muted/50">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Info className="h-5 w-5" />
          System Architecture
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Voice I/O Layer</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>OpenAI Realtime API (WebRTC)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Speech-to-Text (~300ms latency)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Text-to-Speech (natural voice)</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Reasoning Layer</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Claude Sonnet 4.5 (200K context)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>42+ integrated tools</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Secure WebSocket bridge</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Prerequisites Alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Prerequisites:</strong> Ensure backend is running with <code className="px-1 py-0.5 bg-muted rounded">OPENAI_API_KEY</code> configured.
          Microphone access will be requested when starting a session.
        </AlertDescription>
      </Alert>

      {/* Voice Interface */}
      <Card className="p-6 mb-6">
        <PAMVoiceHybrid />
      </Card>

      {/* Testing Instructions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">Testing Guide</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Quick Start</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click "Start Voice Session" button above</li>
              <li>Allow microphone access when prompted</li>
              <li>Wait for the green "Connected" badge</li>
              <li>Start speaking naturally</li>
            </ol>
          </div>

          <div>
            <h3 className="font-medium mb-2">Example Commands</h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">💰 Budget Tools</p>
                <ul className="space-y-0.5 text-muted-foreground text-xs">
                  <li>"Add a $50 gas expense"</li>
                  <li>"How much did I spend on food?"</li>
                  <li>"Show my budget summary"</li>
                </ul>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">🗺️ Trip Planning</p>
                <ul className="space-y-0.5 text-muted-foreground text-xs">
                  <li>"Plan a trip from Phoenix to Seattle"</li>
                  <li>"Find RV parks near Yellowstone"</li>
                  <li>"What's the weather forecast?"</li>
                </ul>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">👥 Social Features</p>
                <ul className="space-y-0.5 text-muted-foreground text-xs">
                  <li>"Post a photo from my trip"</li>
                  <li>"Message Sarah about meeting up"</li>
                  <li>"Who's camping nearby?"</li>
                </ul>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">⚡ Quick Queries</p>
                <ul className="space-y-0.5 text-muted-foreground text-xs">
                  <li>"What's my total spending?"</li>
                  <li>"Find cheap gas near me"</li>
                  <li>"How far is it to Las Vegas?"</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">What to Test</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Speech recognition accuracy in different environments</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Response latency (should be under 3 seconds)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Tool execution (e.g., expense tracking, weather)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Interruption (click "Interrupt" while PAM is speaking)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Multi-turn conversation (context preservation)</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Expected Behavior</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li><strong>Latency:</strong> ~500-800ms speech-to-speech</li>
              <li><strong>Voice Quality:</strong> Natural, expressive (using "marin" voice)</li>
              <li><strong>Context:</strong> PAM remembers conversation history</li>
              <li><strong>Tools:</strong> PAM executes actions (tracks expenses, plans trips, etc.)</li>
              <li><strong>Safety:</strong> Can interrupt mid-sentence</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Technical Details */}
      <Card className="p-6 mt-6 bg-muted/30">
        <h2 className="text-lg font-semibold mb-3">Technical Details</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Architecture:</strong> Hybrid system where OpenAI handles voice I/O only,
            while Claude Sonnet 4.5 handles all reasoning and tool execution via WebSocket bridge.
          </p>
          <p>
            <strong>Cost:</strong> ~$0.15-0.30 per 5-minute conversation (OpenAI voice + Claude reasoning).
          </p>
          <p>
            <strong>Security:</strong> Ephemeral session tokens (1-hour lifetime), no API keys in browser.
          </p>
          <p>
            <strong>Documentation:</strong> See <code className="px-1 py-0.5 bg-muted rounded">docs/PAM_VOICE_HYBRID_INTEGRATION_GUIDE.md</code> for full details.
          </p>
        </div>
      </Card>
    </div>
  );
}
