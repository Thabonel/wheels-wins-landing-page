
import { useState } from "react";

type Action = {
  type: string;
  content?: string;
  [key: string]: any;
};

export default function TestOrchestrator() {
  const [log, setLog] = useState<string[]>([]);
  const runTest = async () => {
    setLog([]);
    const token = localStorage.getItem("supabase.auth.token") || "";
    const res = await fetch("/api/chat/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: "demo_user",
        message: "Find free campsites within 50km of Sydney",
      }),
    });
    const data = await res.json();
    const entries: string[] = [];
    entries.push(`Response text: ${data.response}`);
    (data.actions as Action[]).forEach((act, i) => {
      entries.push(`Action ${i + 1}: ${JSON.stringify(act)}`);
    });
    setLog(entries);
  };

  return (
    <div className="p-4">
      <button
        onClick={runTest}
        className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
      >
        Test Orchestrator
      </button>
      <div className="space-y-2">
        {log.map((line, idx) => (
          <div key={idx} className="font-mono text-sm">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
