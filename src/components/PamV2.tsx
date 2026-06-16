import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

import {
  V2ChatState,
  V2ChatMessage,
  createInitialState,
  v2ChatReducer,
  streamTurn,
} from "@/services/pamV2/pamV2Client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function PamV2Chat({ state, onSend, onCancel }: {
  state: V2ChatState;
  onSend: (msg: string, approvalToken?: string) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const handleSend = () => {
    if (!input.trim() || state.streaming) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {state.messages.length === 0 && (
          <p className="text-gray-400 text-center mt-8">Ask me about your trip, budget, or anything RV-related!</p>
        )}
        {state.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              }`}
            >
              {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
              {msg.pending && !msg.content && !msg.toolCalls?.length && (
                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
              )}
              {msg.toolCalls?.map((tc, i) => (
                <p key={i} className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  🔧 {tc.name}: {tc.status === "running" ? "running..." : tc.summary || tc.status}
                </p>
              ))}
              {msg.approvalRequired && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-300 text-xs">
                  <p className="font-medium">Approval Required</p>
                  <p>{msg.approvalRequired.actionSummary}</p>
                  <button
                    onClick={() => onSend("", msg.approvalRequired!.token)}
                    className="mt-1 px-3 py-1 bg-green-600 text-white rounded text-xs"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {state.error && (
          <div className="text-center text-red-500 text-xs p-2">{state.error}</div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Pam..."
          disabled={state.streaming}
          className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <button
          onClick={state.streaming ? onCancel : handleSend}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            state.streaming
              ? "bg-red-500 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {state.streaming ? "Stop" : "Send"}
        </button>
      </div>
    </div>
  );
}

export default function PamV2() {
  const [open, setOpen] = useState(false);
  const [state, dispatch] = useState(createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = async (content: string, approvalToken?: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const id = crypto.randomUUID();
    dispatch((prev) => v2ChatReducer(prev, { type: "ADD_USER_MESSAGE", payload: { id, content } }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    await streamTurn({
      message: content,
      conversationId: stateRef.current.conversationId,
      clientMessageId: id,
      approvalToken,
      authToken: token,
      onEvent: (action) => dispatch((prev) => v2ChatReducer(prev, action)),
      onError: (err) =>
        dispatch((prev) =>
          v2ChatReducer(prev, {
            type: "ERROR",
            payload: { event: "error", message: err.message, code: "client_error", schema_version: "2026-06-16", trace_id: "", sequence: 0 },
          }),
        ),
      signal: ctrl.signal,
    });

    abortRef.current = null;
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 flex items-center justify-center text-2xl"
        aria-label={open ? "Close Pam" : "Open Pam"}
      >
        {open ? "✕" : "💬"}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)]">
          <PamV2Chat state={state} onSend={sendMessage} onCancel={cancel} />
        </div>
      )}
    </>
  );
}
