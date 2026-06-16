import { PAM_V2_SCHEMA_VERSION, type PamTurnRequestV2, type PamEventV2 } from "@/types/pamV2";
import { eventToAction, type V2ChatAction } from "./pamV2Reducer";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://wheels-wins-backend-staging.onrender.com";

export interface StreamTurnOptions {
  message: string;
  conversationId: string;
  clientMessageId?: string;
  approvalToken?: string;
  authToken: string;
  onEvent: (action: V2ChatAction) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
    client_message_id: clientMessageId || generateId(),
    message,
    channel: "text",
    locale: "en-AU",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney",
  };
  if (approvalToken) {
    body.approval_token = approvalToken;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v2/pam/turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({
        code: "unknown",
        message: `HTTP ${res.status}`,
      }));
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
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const event: PamEventV2 = JSON.parse(trimmed.slice(6));
          if (event.schema_version !== PAM_V2_SCHEMA_VERSION) {
            onError(
              new Error(
                `Unsupported schema version: ${event.schema_version}. Expected ${PAM_V2_SCHEMA_VERSION}.`,
              ),
            );
            return;
          }
          const action = eventToAction(event);
          if (action) onEvent(action);
        } catch {
          // Skip malformed lines silently.
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
