/**
 * Hybrid PAM Component
 *
 * Cost-optimized AI assistant using:
 * - GPT-4o-mini for simple queries (95% of traffic, $0.075/1M tokens)
 * - Claude Agent SDK for complex tasks (5% of traffic, $3/1M tokens)
 *
 * Expected cost reduction: 77-90% compared to GPT-5 system
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Zap, Brain, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { usePamHybridWebSocket } from '@/hooks/pam/usePamHybridWebSocket';
import { pamHybridService } from '@/services/pamHybridService';
import { cn } from '@/lib/utils';

export const HybridPAM: React.FC = () => {
  const {
    isConnected,
    isConnecting,
    error,
    messages,
    isTyping,
    sendMessage,
    clearMessages,
    reconnect,
    totalCost,
    averageLatency
  } = usePamHybridWebSocket();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send
  const handleSend = () => {
    if (!input.trim() || isTyping || !isConnected) return;

    sendMessage(input.trim());
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Get handler badge
  const getHandlerBadge = (handler?: string) => {
    if (!handler) return null;

    const isSimple = handler === 'gpt4o-mini';
    const isFallback = handler.includes('fallback');

    return (
      <Badge
        variant={isSimple ? 'default' : 'secondary'}
        className={cn(
          'text-xs',
          isSimple && 'bg-green-100 text-green-800',
          !isSimple && !isFallback && 'bg-purple-100 text-purple-800',
          isFallback && 'bg-orange-100 text-orange-800'
        )}
      >
        {isSimple && <Zap className="w-3 h-3 mr-1" />}
        {!isSimple && !isFallback && <Brain className="w-3 h-3 mr-1" />}
        {pamHybridService.getHandlerDisplayName(handler)}
      </Badge>
    );
  };

  // Get complexity badge
  const getComplexityBadge = (complexity?: string) => {
    if (!complexity) return null;

    const colors = {
      simple: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      complex: 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge
        variant="outline"
        className={cn('text-xs capitalize', colors[complexity as keyof typeof colors])}
      >
        {complexity}
      </Badge>
    );
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>PAM Hybrid Assistant</CardTitle>
            <Badge
              variant={isConnected ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                isConnected && 'bg-green-100 text-green-800',
                isConnecting && 'bg-yellow-100 text-yellow-800',
                !isConnected && !isConnecting && 'bg-red-100 text-red-800'
              )}
            >
              {isConnected && '● Connected'}
              {isConnecting && '⟳ Connecting...'}
              {!isConnected && !isConnecting && '○ Disconnected'}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span className="font-mono">{pamHybridService.formatCost(totalCost)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{averageLatency}ms</span>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
              {!isConnected && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={reconnect}
                  className="text-red-600 p-0 h-auto mt-1"
                >
                  Try reconnecting
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length === 0 && !error && (
          <div className="text-center text-gray-500 py-8">
            <Brain className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Ask me anything! I'll route your query to the best handler.</p>
            <p className="text-xs mt-1">Simple queries use GPT-4o-mini, complex tasks use Claude agents.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-lg p-3',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* Assistant message metadata */}
              {msg.role === 'assistant' && (
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                  {getHandlerBadge(msg.handler)}
                  {getComplexityBadge(msg.complexity)}

                  {msg.cost_usd !== undefined && (
                    <span className="text-xs text-gray-600">
                      {pamHybridService.formatCost(msg.cost_usd)}
                    </span>
                  )}

                  {msg.latency_ms !== undefined && (
                    <span className="text-xs text-gray-600">
                      {msg.latency_ms}ms
                    </span>
                  )}

                  {msg.tools_called && msg.tools_called.length > 0 && (
                    <span className="text-xs text-gray-600">
                      🔧 {msg.tools_called.length} tools
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              <span className="text-sm text-gray-600">Processing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={!isConnected || isTyping}
            className="resize-none min-h-[60px] max-h-[200px]"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping || !isConnected}
            className="px-4"
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {isConnected && (
            <span className="text-green-600">● Ready</span>
          )}
        </div>
      </div>
    </Card>
  );
};