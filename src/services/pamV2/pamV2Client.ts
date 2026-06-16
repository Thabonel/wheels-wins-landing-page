import type {
  PamEventV2,
  PamTurnRequestV2,
  TurnStartedEvent,
  TurnCompletedEvent,
  TextDeltaEvent,
  ErrorEvent,
  ApprovalRequiredEvent,
} from "@/types/pamV2";

export interface V2ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pending?: boolean;
  toolCalls?: { name: string; summary?: string; status: string }[];
  approvalRequired?: {
    token: string;
    actionType: string;
    actionSummary: string;
  };
}

export interface V2ChatState {
  messages: V2ChatMessage[];
  streaming: boolean;
  conversationId: string;
  error?: string;
}

export type V2ChatAction =
  | { type: "TURN_STARTED"; payload: TurnStartedEvent }
  | { type: "TEXT_DELTA"; payload: TextDeltaEvent }
  | { type: "TOOL_STARTED"; payload: { tool_name: string } }
  | { type: "TOOL_COMPLETED"; payload: { tool_name: string; status: string; result_summary?: string | null } }
  | { type: "APPROVAL_REQUIRED"; payload: ApprovalRequiredEvent }
  | { type: "TURN_COMPLETED"; payload: { finish_reason: string } }
  | { type: "ERROR"; payload: ErrorEvent }
  | { type: "ADD_USER_MESSAGE"; payload: { id: string; content: string } }
  | { type: "CLEAR_ERROR" };

let nextClientMessageId = () => crypto.randomUUID();
let nextLocalId = () => crypto.randomUUID();

function genId(): string {
  return nextLocalId();
}

export function createInitialState(): V2ChatState {
  return {
    messages: [],
    streaming: false,
    conversationId: crypto.randomUUID(),
  };
}

export function v2ChatReducer(state: V2ChatState, action: V2ChatAction): V2ChatState {
  switch (action.type) {
    case "ADD_USER_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: action.payload.id, role: "user", content: action.payload.content },
          { id: genId(), role: "assistant", content: "", pending: true },
        ],
        streaming: true,
        error: undefined,
      };

    case "TURN_STARTED":
      return state;

    case "TEXT_DELTA": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.pending) {
        msgs[msgs.length - 1] = { ...last, content: last.content + action.payload.delta };
      }
      return { ...state, messages: msgs };
    }

    case "TOOL_STARTED": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.pending) {
        const calls = last.toolCalls || [];
        msgs[msgs.length - 1] = {
          ...last,
          toolCalls: [...calls, { name: action.payload.tool_name, status: "running" }],
        };
      }
      return { ...state, messages: msgs };
    }

    case "TOOL_COMPLETED": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.pending && last.toolCalls) {
        const calls = last.toolCalls.map((tc) =>
          tc.name === action.payload.tool_name
            ? { ...tc, status: action.payload.status, summary: action.payload.result_summary ?? undefined }
            : tc,
        );
        msgs[msgs.length - 1] = { ...last, toolCalls: calls };
      }
      return { ...state, messages: msgs };
    }

    case "APPROVAL_REQUIRED": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.pending) {
        msgs[msgs.length - 1] = {
          ...last,
          approvalRequired: {
            token: action.payload.approval_token,
            actionType: action.payload.action_type,
            actionSummary: action.payload.action_summary,
          },
        };
      }
      return { ...state, messages: msgs };
    }

    case "TURN_COMPLETED": {
      const msgs = [...state.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx]?.pending) {
        msgs[lastIdx] = { ...msgs[lastIdx], pending: false };
      }
      return { ...state, messages: msgs, streaming: false };
    }

    case "ERROR": {
      const msgs = [...state.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx]?.pending) {
        msgs[lastIdx] = { ...msgs[lastIdx], pending: false };
      }
      return {
        ...state,
        messages: msgs,
        streaming: false,
        error: action.payload.message,
      };
    }

    case "CLEAR_ERROR":
      return { ...state, error: undefined };
  }
}

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://wheels-wins-backend-staging.onrender.com";

interface StreamTurnOptions {
  message: string;
  conversationId: string;
  clientMessageId?: string;
  approvalToken?: string;
  authToken: string;
  onEvent: (action: V2ChatAction) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export async function streamTurn({
  message,
  conversationId,
  clientMessageId,
  approvalToken,
  authToken,
  onEvent,
  onError,
  signal,
}: StreamTurnOptions): Promise<void> {
  const body: PamTurnRequestV2 = {
    conversation_id: conversationId,
    client_message_id: clientMessageId || crypto.randomUUID(),
    message,
    channel: "text",
    locale: "en-AU",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney",
  };
  if (approvalToken) {
    body.approval_token = approvalToken;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${authToken}`,
    };

    const res = await fetch(`${BACKEND_URL}/api/v2/pam/turn`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ code: "unknown", message: `HTTP ${res.status}` }));
      onError(new Error(errBody.message || `HTTP ${res.status}`));
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError(new Error("No response body"));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const event: PamEventV2 = JSON.parse(trimmed.slice(6));
            dispatchEvent(event, onEvent);
          } catch {
            // skip malformed lines
          }
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

function dispatchEvent(event: PamEventV2, onEvent: (action: V2ChatAction) => void) {
  switch (event.event) {
    case "turn_started":
      break;
    case "text_delta":
      onEvent({ type: "TEXT_DELTA", payload: event });
      break;
    case "tool_started":
      onEvent({ type: "TOOL_STARTED", payload: { tool_name: event.tool_name } });
      break;
    case "tool_completed":
      onEvent({
        type: "TOOL_COMPLETED",
        payload: { tool_name: event.tool_name, status: event.status, result_summary: event.result_summary },
      });
      break;
    case "approval_required":
      onEvent({ type: "APPROVAL_REQUIRED", payload: event });
      break;
    case "turn_completed":
      onEvent({ type: "TURN_COMPLETED", payload: { finish_reason: event.finish_reason } });
      break;
    case "error":
      onEvent({ type: "ERROR", payload: event });
      break;
  }
}
