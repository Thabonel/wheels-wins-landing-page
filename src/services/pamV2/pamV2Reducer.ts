import type { PamEventV2, ToolCompletionStatus, FinishReason } from "@/types/pamV2";

export interface V2ToolCall {
  id: string;
  name: string;
  status: "running" | ToolCompletionStatus;
  summary?: string;
}

export interface V2Approval {
  token: string;
  actionType: string;
  actionSummary: string;
  expiresAt: string;
  status?: "pending" | "approved" | "rejected" | "expired";
}

export interface V2ActionDisplay {
  id: string;
  actionType: string;
  payload: Record<string, unknown>;
}

export interface V2ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  toolCalls?: V2ToolCall[];
  approval?: V2Approval;
  actions?: V2ActionDisplay[];
}

export interface V2ChatState {
  messages: V2ChatMessage[];
  streaming: boolean;
  conversationId: string;
  error?: string;
}

export type V2ChatAction =
  | {
      type: "ADD_USER_MESSAGE";
      payload: {
        userMessageId: string;
        assistantMessageId: string;
        content: string;
      };
    }
  | { type: "TEXT_DELTA"; payload: { delta: string } }
  | { type: "TOOL_STARTED"; payload: { toolCallId: string; toolName: string } }
  | {
      type: "TOOL_COMPLETED";
      payload: {
        toolCallId: string;
        toolName: string;
        status: ToolCompletionStatus;
        resultSummary?: string | null;
      };
    }
  | {
      type: "APPROVAL_REQUIRED";
      payload: {
        approvalToken: string;
        actionType: string;
        actionSummary: string;
        expiresAt: string;
      };
    }
  | {
      type: "APPROVAL_RESPONSE";
      payload: { approvalToken: string; response: "approved" | "rejected" };
    }
  | {
      type: "ACTION";
      payload: { actionType: string; payload: Record<string, unknown> };
    }
  | { type: "TURN_COMPLETED"; payload: { finishReason: FinishReason } }
  | { type: "ERROR"; payload: { code: string; message: string } }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" };

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createInitialState(): V2ChatState {
  return {
    messages: [],
    streaming: false,
    conversationId: generateId(),
  };
}

function lastAssistant(state: V2ChatState): V2ChatMessage | undefined {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].role === "assistant") {
      return state.messages[i];
    }
  }
  return undefined;
}

function updateLastAssistant(
  state: V2ChatState,
  updater: (msg: V2ChatMessage) => V2ChatMessage,
): V2ChatState {
  const messages = [...state.messages];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      messages[i] = updater(messages[i]);
      return { ...state, messages };
    }
  }
  return state;
}

export function v2ChatReducer(state: V2ChatState, action: V2ChatAction): V2ChatState {
  switch (action.type) {
    case "ADD_USER_MESSAGE": {
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: action.payload.userMessageId,
            role: "user",
            content: action.payload.content,
          },
          {
            id: action.payload.assistantMessageId,
            role: "assistant",
            content: "",
            pending: true,
          },
        ],
        streaming: true,
        error: undefined,
      };
    }

    case "TEXT_DELTA": {
      const assistant = lastAssistant(state);
      if (!assistant?.pending) return state;
      return updateLastAssistant(state, (msg) => ({
        ...msg,
        content: msg.content + action.payload.delta,
      }));
    }

    case "TOOL_STARTED": {
      const assistant = lastAssistant(state);
      if (!assistant?.pending) return state;
      return updateLastAssistant(state, (msg) => ({
        ...msg,
        toolCalls: [
          ...(msg.toolCalls || []),
          { id: action.payload.toolCallId, name: action.payload.toolName, status: "running" },
        ],
      }));
    }

    case "TOOL_COMPLETED": {
      const assistant = lastAssistant(state);
      if (!assistant?.pending || !assistant.toolCalls?.length) return state;
      return updateLastAssistant(state, (msg) => ({
        ...msg,
        toolCalls: msg.toolCalls!.map((tc) =>
          tc.id === action.payload.toolCallId
            ? {
                ...tc,
                status: action.payload.status,
                summary: action.payload.resultSummary ?? undefined,
              }
            : tc,
        ),
      }));
    }

    case "APPROVAL_REQUIRED": {
      const assistant = lastAssistant(state);
      if (!assistant) return state;
      return updateLastAssistant(state, (msg) => ({
        ...msg,
        pending: false,
        approval: {
          token: action.payload.approvalToken,
          actionType: action.payload.actionType,
          actionSummary: action.payload.actionSummary,
          expiresAt: action.payload.expiresAt,
          status: "pending",
        },
      }));
    }

    case "APPROVAL_RESPONSE": {
      return updateLastAssistant(state, (msg) => {
        if (!msg.approval || msg.approval.token !== action.payload.approvalToken) {
          return msg;
        }
        return {
          ...msg,
          approval: { ...msg.approval, status: action.payload.response },
        };
      });
    }

    case "ACTION": {
      const assistant = lastAssistant(state);
      if (!assistant) return state;
      return updateLastAssistant(state, (msg) => ({
        ...msg,
        actions: [
          ...(msg.actions || []),
          {
            id: generateId(),
            actionType: action.payload.actionType,
            payload: action.payload.payload,
          },
        ],
      }));
    }

    case "TURN_COMPLETED": {
      const assistant = lastAssistant(state);
      if (!assistant) return { ...state, streaming: false };
      return {
        ...updateLastAssistant(state, (msg) => ({
          ...msg,
          pending: false,
        })),
        streaming: false,
      };
    }

    case "ERROR": {
      const assistant = lastAssistant(state);
      const next = assistant
        ? updateLastAssistant(state, (msg) => ({ ...msg, pending: false }))
        : state;
      return { ...next, streaming: false, error: action.payload.message };
    }

    case "CLEAR_ERROR":
      return { ...state, error: undefined };

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}

export function eventToAction(event: PamEventV2): V2ChatAction | null {
  switch (event.event) {
    case "text_delta":
      return { type: "TEXT_DELTA", payload: { delta: event.delta } };
    case "tool_started":
      return {
        type: "TOOL_STARTED",
        payload: { toolCallId: event.tool_call_id, toolName: event.tool_name },
      };
    case "tool_completed":
      return {
        type: "TOOL_COMPLETED",
        payload: {
          toolCallId: event.tool_call_id,
          toolName: event.tool_name,
          status: event.status,
          resultSummary: event.result_summary,
        },
      };
    case "approval_required":
      return {
        type: "APPROVAL_REQUIRED",
        payload: {
          approvalToken: event.approval_token,
          actionType: event.action_type,
          actionSummary: event.action_summary,
          expiresAt: event.expires_at,
        },
      };
    case "action":
      return {
        type: "ACTION",
        payload: { actionType: event.action_type, payload: event.payload },
      };
    case "turn_completed":
      return { type: "TURN_COMPLETED", payload: { finishReason: event.finish_reason } };
    case "error":
      return { type: "ERROR", payload: { code: event.code, message: event.message } };
    default:
      return null;
  }
}
