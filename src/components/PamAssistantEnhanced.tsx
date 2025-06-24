
import React, { useEffect, useState } from 'react';
import { MessageSquare, X, Loader2, Wifi, WifiOff } from 'lucide-react';
import { usePamWebSocket } from '@/hooks/usePamWebSocket';
import { pamUIController } from '@/lib/pam/PamUIController';
import { useAuth } from '@/context/AuthContext';

export function PamAssistantEnhanced() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected, sendMessage } = usePamWebSocket();
  const { user } = useAuth();

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    
    // Send message via WebSocket as string
    sendMessage(message.trim());

    // Also send to backend for processing
    try {
      const response = await fetch(`${process.env.NODE_ENV === 'production' 
        ? 'https://pam-backend.onrender.com' 
        : 'http://localhost:8000'}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token') || 'demo-token'}`
        },
        body: JSON.stringify({
          message: message.trim(),
          user_id: user?.id || 'anonymous'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Handle response
        console.log('PAM response:', data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
      setMessage('');
    }
  };

  // Demo function to show PAM's capabilities
  const demoAction = async () => {
    setIsProcessing(true);
    
    // Example: Add expense workflow
    await pamUIController.executeWorkflow([
      { type: 'scroll', selector: '#expense-form' },
      { type: 'wait', duration: 500 },
      { type: 'fill', selector: '#amount', value: '50.00' },
      { type: 'wait', duration: 500 },
      { type: 'fill', selector: '#category', value: 'Fuel' },
      { type: 'wait', duration: 500 },
      { type: 'click', selector: '#submit-expense' }
    ]);
    
    setIsProcessing(false);
  };

  return (
    <>
      {/* PAM Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-all z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* PAM Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="bg-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">PAM - Your AI Assistant</h3>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-300" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-300" />
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-700 rounded p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-sm">
                  Hi! I'm PAM, your AI assistant. I can help you:
                </p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>• Add expenses and manage budgets</li>
                  <li>• Plan trips and track fuel</li>
                  <li>• Schedule vehicle maintenance</li>
                  <li>• Find community tips and hustles</li>
                </ul>
              </div>

              {isProcessing && (
                <div className="flex items-center gap-2 text-purple-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">PAM is working on that...</span>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask PAM anything..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={isProcessing || !message.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Send
              </button>
            </div>
            
            {/* Demo Button */}
            <button
              onClick={demoAction}
              className="mt-2 text-xs text-purple-600 hover:text-purple-700"
            >
              Demo: Add Expense
            </button>
          </div>
        </div>
      )}
    </>
  );
}
