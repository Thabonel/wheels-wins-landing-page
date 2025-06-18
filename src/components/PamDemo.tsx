import React, { useState } from 'react';
import { MessageSquare, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export function PamDemo() {
  const [messages, setMessages] = useState<Array<{type: string, content: string}>>([
    { type: 'pam', content: '�� Hi! I\'m PAM, your AI assistant. Try these commands:' },
    { type: 'pam', content: '• "I spent $25 on fuel today"' },
    { type: 'pam', content: '• "Show my budget"' },
    { type: 'pam', content: '• "Add $50 groceries expense"' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const simulateExpenseAdd = (amount: number, category: string) => {
    setMessages(prev => [...prev, 
      { type: 'pam', content: `✅ Added $${amount} expense to ${category} category.` },
      { type: 'pam', content: `💰 Budget Status: You've used 65% of your ${category} budget this month.` },
      { type: 'pam', content: `📊 Navigating to expenses page...` }
    ]);
  };

  const simulateBudgetCheck = () => {
    setMessages(prev => [...prev,
      { type: 'pam', content: '📊 Financial Overview:' },
      { type: 'pam', content: 'This month: $1,247.50' },
      { type: 'pam', content: 'Daily average: $41.58' },
      { type: 'pam', content: 'Top category: Fuel ($420.00)' }
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setInput('');
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      // Simple intent detection
      if (userMessage.toLowerCase().includes('spent') || userMessage.toLowerCase().includes('expense')) {
        const amountMatch = userMessage.match(/\$?(\d+(?:\.\d{2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 25;
        
        let category = 'miscellaneous';
        if (userMessage.toLowerCase().includes('fuel') || userMessage.toLowerCase().includes('gas')) category = 'fuel';
        else if (userMessage.toLowerCase().includes('food') || userMessage.toLowerCase().includes('groceries')) category = 'groceries';
        else if (userMessage.toLowerCase().includes('transport')) category = 'transport';
        
        simulateExpenseAdd(amount, category);
      } else if (userMessage.toLowerCase().includes('budget') || userMessage.toLowerCase().includes('show')) {
        simulateBudgetCheck();
      } else {
        setMessages(prev => [...prev, 
          { type: 'pam', content: `I understand you want help with: "${userMessage}"` },
          { type: 'pam', content: 'I can help you manage expenses, budgets, and financial tracking!' }
        ]);
      }
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-8 h-8 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-800">PAM Demo - AI Financial Assistant</h2>
      </div>
      
      {/* Chat Messages */}
      <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-3 py-2 rounded-lg ${
              msg.type === 'user' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white border border-gray-200'
            }`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-3 py-2 rounded-lg">
              <p className="text-sm">🤖 PAM is thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Try: 'I spent $25 on fuel today'"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {/* Quick Actions */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setInput("I spent $25 on fuel today")}
          className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
        >
          💰 Add Expense
        </button>
        <button
          onClick={() => setInput("Show my budget")}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
        >
          📊 Check Budget
        </button>
        <button
          onClick={() => setInput("Add $50 groceries expense")}
          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
        >
          🛒 Groceries
        </button>
      </div>

      {/* Features */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-purple-50 rounded-lg">
          <DollarSign className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <p className="text-xs font-medium">Expense Tracking</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-xs font-medium">Budget Management</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <AlertCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-xs font-medium">Smart Alerts</p>
        </div>
      </div>
    </div>
  );
}
