import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Square, AlertCircle } from "lucide-react";
import { usePamV2Chat } from "@/services/pamV2/usePamV2Chat";
import { PamActionRegistry } from "@/services/pamV2/actions/PamActionRegistry";
import type { V2ChatMessage } from "@/services/pamV2/pamV2Reducer";

function ChatMessage({
  msg,
  onApprove,
  onReject,
}: {
  msg: V2ChatMessage;
  onApprove?: (token: string) => void;
  onReject?: (token: string) => void;
}) {
  const isUser = msg.role === "user";
  if (isUser && !msg.content) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-700"
        }`}
      >
        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

        {msg.pending && !msg.content && !msg.toolCalls?.length && !msg.approval && (
          <span className="flex items-center gap-1 text-gray-400" aria-label="Pam is typing">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.1s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
          </span>
        )}

        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {msg.toolCalls.map((tc) => (
              <div
                key={tc.id}
                className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
              >
                <span className="font-medium">{tc.name}</span>
                <span className="capitalize">
                  {tc.status === "running" ? "Running…" : tc.summary || tc.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {msg.actions && msg.actions.length > 0 && (
          <PamActionRegistry actions={msg.actions} />
        )}

        {msg.approval && msg.approval.status === "pending" && onApprove && onReject && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              Approval required
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
              {msg.approval.actionSummary}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onReject(msg.approval!.token)}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border border-yellow-400 dark:border-yellow-600 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                Reject
              </button>
              <button
                onClick={() => onApprove(msg.approval!.token)}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Approve
              </button>
            </div>
          </div>
        )}

        {msg.approval && msg.approval.status !== "pending" && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
            {msg.approval.status === "approved" ? "Approved" : "Rejected"}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PamV2() {
  const [open, setOpen] = useState(false);
  const { state, sendMessage, approve, reject, cancel, clearChat, clearError, ready } =
    usePamV2Chat();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (
        endRef.current &&
        typeof endRef.current.scrollIntoView === "function"
      ) {
        endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
      inputRef.current?.focus();
    }
  }, [open, state.messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || state.streaming || !ready) return;
    sendMessage(trimmed);
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 flex items-center justify-center transition-transform"
        aria-label={open ? "Close Pam" : "Open Pam"}
        aria-expanded={open}
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          role="dialog"
          aria-label="Pam chat"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pam</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ready ? "Online" : "Sign in to chat"}</p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Clear conversation"
            >
              Clear
            </button>
          </header>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {state.messages.length === 0 && (
              <div className="text-center mt-12">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Ask me about your trip, budget, or anything RV-related.
                </p>
              </div>
            )}

            {state.messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                onApprove={approve}
                onReject={reject}
              />
            ))}

            {state.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-red-800 dark:text-red-200">{state.error}</p>
                  <button
                    onClick={clearError}
                    className="mt-1 text-xs font-medium text-red-700 dark:text-red-300 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          <footer className="border-t border-gray-200 dark:border-gray-700 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={ready ? "Ask Pam..." : "Sign in to chat"}
                disabled={!ready || state.streaming}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                aria-label="Message Pam"
              />
              <button
                type={state.streaming ? "button" : "submit"}
                onClick={state.streaming ? cancel : undefined}
                disabled={!ready}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                  state.streaming
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                aria-label={state.streaming ? "Stop generating" : "Send message"}
              >
                {state.streaming ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </footer>
        </div>
      )}
    </>
  );
}
