/**
 * PAM Enhanced WebSocket Example Component
 * 
 * Demonstrates how to use the new enhanced PAM system with:
 * - Context-aware message enrichment
 * - Memory integration and learning
 * - Intelligent response handling
 * - Real-time stats monitoring
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePamWebSocketEnhanced } from '@/hooks/pam/usePamWebSocketEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, MessageCircle, BarChart3, Settings, Eye, EyeOff } from 'lucide-react';

export const PamEnhancedExample: React.FC = () => {
  const { user, session } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const [showStats, setShowStats] = useState(false);

  // Use the enhanced WebSocket hook
  const {
    isConnected,
    connectionStatus,
    messages,
    sendMessage,
    clearMessages,
    currentContext,
    updateContext,
    isEnrichmentEnabled,
    toggleEnrichment,
    getStats,
    error
  } = usePamWebSocketEnhanced(user?.id || null, session?.access_token || null, {
    enableContextEnrichment: true,
    enableMemoryLearning: true,
    enableProactiveInsights: false, // Disabled for this demo
    
    onEnrichedMessage: (message) => {
      console.log('📨 Enhanced message received:', message);
    },
    
    onContextUpdate: (context) => {
      console.log('🔄 Context updated:', context);
    },
    
    onLearningSignal: (signal) => {
      console.log('🧠 Learning signal:', signal);
    }
  });

  const stats = getStats();

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const success = await sendMessage(inputMessage);
    if (success) {
      setInputMessage('');
    }
  };

  // Update context when page changes (demo)
  useEffect(() => {
    updateContext(window.location.pathname);
  }, [updateContext]);

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Please log in to test the enhanced PAM system
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            PAM Enhanced WebSocket Demo
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {connectionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status & Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => toggleEnrichment(!isEnrichmentEnabled)}
              variant={isEnrichmentEnabled ? 'default' : 'outline'}
              size="sm"
            >
              {isEnrichmentEnabled ? <Brain className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isEnrichmentEnabled ? 'Enrichment On' : 'Enrichment Off'}
            </Button>
            
            <Button
              onClick={() => setShowStats(!showStats)}
              variant="outline"
              size="sm"
            >
              <BarChart3 className="h-4 w-4" />
              Stats
            </Button>
            
            <Button
              onClick={clearMessages}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">Error: {error}</p>
            </div>
          )}

          {/* Context Info */}
          {currentContext && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm">
                <strong>Current Context:</strong>
                <div className="mt-1 space-y-1">
                  <div>Page: {currentContext.currentPage}</div>
                  <div>Activity: {currentContext.currentActivity}</div>
                  <div>Time: {currentContext.timeOfDay}</div>
                  <div>Device: {currentContext.deviceType}</div>
                  {currentContext.preferences.length > 0 && (
                    <div>Preferences: {currentContext.preferences.length} loaded</div>
                  )}
                  {currentContext.recentMemories.length > 0 && (
                    <div>Recent Memories: {currentContext.recentMemories.length}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats Panel */}
          {showStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Messages</div>
                    <div className="text-muted-foreground">{stats.totalMessages}</div>
                  </div>
                  <div>
                    <div className="font-medium">Enriched</div>
                    <div className="text-muted-foreground">{stats.enrichedMessages}</div>
                  </div>
                  <div>
                    <div className="font-medium">Memories</div>
                    <div className="text-muted-foreground">{stats.memoriesStored}</div>
                  </div>
                  <div>
                    <div className="font-medium">Preferences</div>
                    <div className="text-muted-foreground">{stats.preferencesLearned}</div>
                  </div>
                  <div>
                    <div className="font-medium">Context Refresh</div>
                    <div className="text-muted-foreground">{stats.contextRefreshCount}</div>
                  </div>
                  <div>
                    <div className="font-medium">Avg Enrichment</div>
                    <div className="text-muted-foreground">
                      {Math.round(stats.averageEnrichmentTime)}ms
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Context Confidence</div>
                    <div className="text-muted-foreground">
                      {Math.round(stats.contextConfidence * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Queue</div>
                    <div className="text-muted-foreground">{stats.queuedMessages}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask PAM something... (try 'I want to plan a trip to Utah')"
              className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={!isConnected}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!isConnected || !inputMessage.trim()}
            >
              <MessageCircle className="h-4 w-4" />
              Send
            </Button>
          </div>

          {/* Messages Display */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Send a message to test the enhanced PAM system!
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  {/* Message Content */}
                  <div className={`p-3 rounded-lg ${
                    message.type === 'message' 
                      ? 'bg-blue-50 border-l-4 border-blue-500 ml-auto max-w-[80%]'
                      : 'bg-gray-50 border-l-4 border-gray-500'
                  }`}>
                    <div className="text-sm font-medium mb-1">
                      {message.type === 'message' ? 'You' : 'PAM'}
                    </div>
                    <div>{message.message || message.content}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Enrichment Info */}
                  {message.enrichment && isEnrichmentEnabled && (
                    <div className="ml-4 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                      <div><strong>Intent:</strong> {message.enrichment.enrichedContent.userIntent}</div>
                      <div><strong>Confidence:</strong> {Math.round(message.enrichment.enrichedContent.confidence * 100)}%</div>
                      {message.enrichment.enrichedContent.contextClues.length > 0 && (
                        <div><strong>Context Clues:</strong> {message.enrichment.enrichedContent.contextClues.join(', ')}</div>
                      )}
                      {message.enrichment.enrichedContent.relevantMemories.length > 0 && (
                        <div><strong>Relevant Memories:</strong> {message.enrichment.enrichedContent.relevantMemories.length}</div>
                      )}
                      {message.enrichment.enrichedContent.suggestedActions.length > 0 && (
                        <div><strong>Suggested Actions:</strong> {message.enrichment.enrichedContent.suggestedActions.join(', ')}</div>
                      )}
                      <div><strong>Processing Time:</strong> {message.enrichment.processingTime}ms</div>
                    </div>
                  )}

                  {/* Learning Signals */}
                  {message.learningSignals && message.learningSignals.length > 0 && (
                    <div className="ml-4 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <div><strong>Learning Signals:</strong></div>
                      {message.learningSignals.map((signal, idx) => (
                        <div key={idx} className="ml-2">
                          • {signal.type} (confidence: {Math.round(signal.confidence * 100)}%)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Test Enhanced PAM</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Try these messages to see different features:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>"I want to plan a camping trip to Utah" - Trip planning intent</li>
              <li>"How much did I spend on gas last month?" - Expense tracking intent</li>
              <li>"Recommend some campgrounds near Moab" - Recommendation request</li>
              <li>"Help me budget for my next adventure" - Help request</li>
            </ul>
            <p className="mt-3">
              <strong>Features to observe:</strong> Context enrichment shows intent detection, 
              confidence scoring, and relevant memories. Learning signals appear when PAM 
              detects patterns or preferences. Stats show system performance metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PamEnhancedExample;