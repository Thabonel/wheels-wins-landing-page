/**
 * @deprecated This test page uses the legacy voice system.
 * The production voice system is PAMVoiceHybridService used in Pam.tsx.
 *
 * This page uses deprecated components:
 * - PamVoice (deprecated) - uses broken useVoice hook
 * - VoiceOrchestrator (deprecated) - never integrated
 *
 * Scheduled for removal in Q2 2026.
 * @see src/components/Pam.tsx (production voice)
 * @see VOICE_RATIONALIZATION_PLAN.md
 */

import React from 'react';
import { PamVoice } from '@/deprecated/components/voice/PamVoice';
import { useVoiceOrchestrator } from '@/deprecated/services/VoiceOrchestrator';
import { useVoiceStore } from '@/stores/useVoiceStore';

/**
 * @deprecated Legacy voice test page
 * 
 * This page allows testing all the new voice features:
 * - Settings-dependent initialization
 * - Sequential audio queue (no double greeting)
 * - Multi-provider TTS fallback
 * - Centralized voice state management
 * - Error handling and recovery
 */
export default function PamVoiceTest() {
  const voiceStore = useVoiceStore();
  const voiceOrchestrator = useVoiceOrchestrator();

  const testMessages = [
    "Hello! I'm PAM, your travel assistant.",
    "This is a test of the new voice architecture.",
    "Notice how messages play sequentially without overlapping.",
    "The voice queue prevents the double greeting issue.",
    "You can interrupt me at any time for natural conversation."
  ];

  const handleTestQueue = () => {
    testMessages.forEach((message, index) => {
      voiceOrchestrator.speak(message, {
        priority: index === 0 ? 'high' : 'normal'
      });
    });
  };

  const handleTestPriority = () => {
    voiceOrchestrator.speak("This is a normal priority message.", { priority: 'normal' });
    voiceOrchestrator.speak("This urgent message should play first!", { priority: 'urgent' });
    voiceOrchestrator.speak("This is another normal message.", { priority: 'normal' });
  };

  const handleTestFallback = () => {
    // This would test TTS provider fallback
    voiceOrchestrator.speak("Testing TTS provider fallback capabilities.", {
      fallbackToText: true
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          PAM Voice Architecture Test
        </h1>
        <p className="text-gray-600">
          Test the new production-grade voice system with centralized state management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice System Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Voice System Status</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Agent Status:</span>
              <span className={`font-medium ${
                voiceStore.agentStatus === 'connected' ? 'text-green-600' :
                voiceStore.agentStatus === 'error' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {voiceStore.agentStatus}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Voice Enabled:</span>
              <span className={`font-medium ${voiceStore.isVoiceEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {voiceStore.isVoiceEnabled ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Settings Loaded:</span>
              <span className={`font-medium ${voiceStore.settingsLoaded ? 'text-green-600' : 'text-yellow-600'}`}>
                {voiceStore.settingsLoaded ? 'Yes' : 'Loading...'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Queue Size:</span>
              <span className="font-medium text-blue-600">
                {voiceStore.audioQueue.length}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Currently Playing:</span>
              <span className={`font-medium ${voiceStore.activePlaybackId ? 'text-green-600' : 'text-gray-500'}`}>
                {voiceStore.activePlaybackId || 'None'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Muted:</span>
              <span className={`font-medium ${voiceStore.isMuted ? 'text-red-600' : 'text-green-600'}`}>
                {voiceStore.isMuted ? 'Yes' : 'No'}
              </span>
            </div>
            
            {voiceStore.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm font-medium">Error:</p>
                <p className="text-red-600 text-sm">{voiceStore.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Voice Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Voice Settings</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Voice:</span>
              <span className="font-medium">{voiceStore.settings.voice}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Rate:</span>
              <span className="font-medium">{voiceStore.settings.rate}x</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Volume:</span>
              <span className="font-medium">{Math.round(voiceStore.settings.volume * 100)}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Auto Play:</span>
              <span className={`font-medium ${voiceStore.settings.autoPlay ? 'text-green-600' : 'text-red-600'}`}>
                {voiceStore.settings.autoPlay ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">VAD Threshold:</span>
              <span className="font-medium">{voiceStore.settings.vadThreshold}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Silence Duration:</span>
              <span className="font-medium">{voiceStore.settings.endpointingSilenceDuration}ms</span>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Voice Tests</h2>
          
          <div className="space-y-3">
            <button
              onClick={handleTestQueue}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              Test Sequential Queue
            </button>
            
            <button
              onClick={handleTestPriority}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
            >
              Test Priority Queue
            </button>
            
            <button
              onClick={handleTestFallback}
              className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
            >
              Test TTS Fallback
            </button>
            
            <button
              onClick={() => voiceOrchestrator.interrupt()}
              className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
            >
              Interrupt (Barge-in)
            </button>
            
            <button
              onClick={() => voiceStore.toggleMute()}
              className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              {voiceStore.isMuted ? 'Unmute' : 'Mute'}
            </button>
            
            <button
              onClick={() => voiceOrchestrator.cancel()}
              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
            >
              Clear Queue
            </button>
          </div>
        </div>

        {/* Audio Queue Visualization */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Audio Queue</h2>
          
          {voiceStore.audioQueue.length === 0 ? (
            <p className="text-gray-500">No items in queue</p>
          ) : (
            <div className="space-y-2">
              {voiceStore.audioQueue.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-md border ${
                    item.id === voiceStore.activePlaybackId
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {index + 1}. {item.text?.substring(0, 50)}
                        {item.text && item.text.length > 50 ? '...' : ''}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                          item.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                          item.priority === 'low' ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {item.priority || 'normal'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    {item.id === voiceStore.activePlaybackId && (
                      <div className="flex items-center text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-2"></div>
                        <span className="text-xs font-medium">Playing</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PAM Interface */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">PAM Interface</h2>
        <p className="text-gray-600 mb-4">
          The PAM interface below uses the new voice architecture. Try opening it and notice:
        </p>
        <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
          <li>Single greeting (no double voice)</li>
          <li>Sequential audio playback</li>
          <li>Proper error handling</li>
          <li>Settings-dependent initialization</li>
          <li>Voice queue management</li>
        </ul>
        
        <PamVoice mode="sidebar" className="w-full max-w-md mx-auto" />
      </div>
    </div>
  );
}