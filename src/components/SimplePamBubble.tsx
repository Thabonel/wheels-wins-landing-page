import React, { useState } from 'react';
import { getPublicAssetUrl } from '@/utils/publicAssets';

/**
 * Simple PAM Bubble - Minimal implementation with no dependencies
 * Just a floating button that opens a chat interface
 */
export function SimplePamBubble() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating PAM Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all z-50"
        aria-label="Open PAM Assistant"
        style={{ width: '64px', height: '64px' }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={getPublicAssetUrl('Pam.webp')}
            alt="PAM"
            className="w-10 h-10 rounded-full"
          />
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500" />
        </div>
      </button>

      {/* Simple Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <img
                src={getPublicAssetUrl('Pam.webp')}
                alt="PAM"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-gray-800">PAM Assistant</h3>
                <p className="text-xs text-gray-500">Ready to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            <div className="text-center text-gray-600 mt-20">
              <p className="mb-4">PAM Assistant is ready!</p>
              <p className="text-sm">Voice mode and chat features coming soon.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white rounded-b-lg">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </>
  );
}
