import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePamWebSocketConnection } from '@/hooks/pam/usePamWebSocketConnection';

export default function ExpenseInput() {
  const { user, token } = useAuth();
  const [input, setInput] = useState('');

  const { isConnected, sendMessage } = usePamWebSocketConnection({
    userId: user?.id || 'anonymous',
    token,
    onMessage: () => {},
    onStatusChange: () => {}
  });

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage({
      type: 'chat',
      message: `Log expense: ${text}`,
      user_id: user?.id || 'anonymous',
      context: { source: 'wins_expenses' }
    });
    setInput('');
  };

  return (
    <div className="flex gap-2 mt-4">
      <input
        className="flex-1 border rounded px-3 py-2"
        placeholder="I spent $25 on gas..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        disabled={!isConnected}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Log Expense
      </button>
    </div>
  );
}
