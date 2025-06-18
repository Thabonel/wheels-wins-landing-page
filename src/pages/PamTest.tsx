import React from 'react';
import { PamDemo } from '@/components/PamDemo';

export default function PamTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🤖 PAM AI Assistant - Live Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the power of PAM - your Personal AI Manager. 
            Try natural language commands to manage your finances!
          </p>
        </div>
        
        <PamDemo />
        
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🚀 What Makes PAM Revolutionary
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-3 text-purple-600">
                🧠 Natural Language Understanding
              </h3>
              <p className="text-gray-600 mb-4">
                Just speak naturally! PAM understands commands like:
              </p>
              <ul className="space-y-2 text-sm">
                <li>• "I spent $50 on groceries today"</li>
                <li>• "How much is left in my fuel budget?"</li>
                <li>• "Add a $200 car maintenance expense"</li>
                <li>• "Show me this month's spending"</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">
                ⚡ Real-time Website Control
              </h3>
              <p className="text-gray-600 mb-4">
                PAM doesn't just chat - it actually controls your website:
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Automatically fills out expense forms</li>
                <li>• Navigates to the right pages</li>
                <li>• Updates budgets and categories</li>
                <li>• Shows visual feedback and alerts</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-3 text-green-600">
                📊 Intelligent Financial Insights
              </h3>
              <p className="text-gray-600 mb-4">
                PAM provides smart analysis of your finances:
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Budget tracking with overage alerts</li>
                <li>• Spending pattern analysis</li>
                <li>• Category breakdown insights</li>
                <li>• Proactive financial recommendations</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-3 text-orange-600">
                🔄 Multi-Domain Expertise
              </h3>
              <p className="text-gray-600 mb-4">
                PAM will handle all aspects of Wheels & Wins:
              </p>
              <ul className="space-y-2 text-sm">
                <li>• 💰 WINS: Expenses, budgets, income tracking</li>
                <li>• 🚗 WHEELS: Trip planning, fuel logs, maintenance</li>
                <li>• 👥 SOCIAL: Groups, hustles, marketplace</li>
                <li>• 📅 YOU: Calendar, events, profile management</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-2">
                🎯 The Future is Here
              </h3>
              <p className="text-lg">
                PAM represents a <strong>500ms response time</strong> vs N8N's 3-5 seconds, 
                with <strong>full website automation</strong> and <strong>natural language control</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
