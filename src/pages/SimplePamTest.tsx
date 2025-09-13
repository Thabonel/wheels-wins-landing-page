import React from 'react';
import { SimplePAM } from '../components/pam/SimplePAM';

const SimplePamTest: React.FC = () => {
  const handleMessageSent = (message: string, response: string) => {
    console.log('Message sent:', message);
    console.log('Response received:', response);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">SimplePAM Test Page</h1>
        <p className="text-gray-600 mb-6">
          Testing the new SimplePAM component with Claude integration.
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-4">
          <SimplePAM 
            onMessageSent={handleMessageSent}
            className="h-[500px]"
          />
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h2 className="font-semibold mb-2">Test Instructions:</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>1. Try typing a message and pressing Enter or clicking Send</li>
            <li>2. Check browser console for message/response logs</li>
            <li>3. Test loading states and error handling</li>
            <li>4. Verify responsive design on different screen sizes</li>
          </ul>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold mb-2">PAM Tool Testing Examples:</h2>
          <p className="text-sm text-gray-600 mb-2">Try these example questions to test tool integration:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>
              <strong>Financial:</strong>
              <ul className="text-gray-600 space-y-1">
                <li>• "Show me my expenses from last month"</li>
                <li>• "What's my current budget status?"</li>
                <li>• "How much have I saved this year?"</li>
                <li>• "What's my income vs expenses?"</li>
              </ul>
            </div>
            <div>
              <strong>Travel & Vehicle:</strong>
              <ul className="text-gray-600 space-y-1">
                <li>• "Show me my recent trips"</li>
                <li>• "How much did I spend on fuel?"</li>
                <li>• "When is my car maintenance due?"</li>
                <li>• "What's my fuel efficiency?"</li>
              </ul>
            </div>
            <div>
              <strong>Profile & Settings:</strong>
              <ul className="text-gray-600 space-y-1">
                <li>• "Show me my profile"</li>
                <li>• "What are my financial goals?"</li>
                <li>• "Check my notification settings"</li>
              </ul>
            </div>
            <div>
              <strong>Calendar & Events:</strong>
              <ul className="text-gray-600 space-y-1">
                <li>• "What events do I have coming up?"</li>
                <li>• "When are my bills due?"</li>
                <li>• "Show me upcoming trips"</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Note: Tool execution requires backend integration (coming in Days 5-7)
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimplePamTest;