import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamTurn } from "../pamV2Transport";
import { PAM_V2_SCHEMA_VERSION } from "@/types/pamV2";

function createMockStream(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    body: {
      getReader: () => ({
        read: async () => {
          if (index < chunks.length) {
            return { done: false, value: encoder.encode(chunks[index++]) };
          }
          return { done: true, value: undefined };
        },
      }),
    },
  };
}

function makeResponse(chunks: string[], ok = true, status = 200) {
  return { ok, status, ...createMockStream(chunks) } as unknown as Response;
}

function sseLine(event: Record<string, unknown>) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

describe("streamTurn", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("streams events to onEvent and stops at terminal event", async () => {
    const events = [
      {
        event: "turn_started",
        schema_version: PAM_V2_SCHEMA_VERSION,
        trace_id: "t1",
        sequence: 0,
        conversation_id: "conv-1",
        client_message_id: "cm-1",
      },
      {
        event: "text_delta",
        schema_version: PAM_V2_SCHEMA_VERSION,
        trace_id: "t1",
        sequence: 1,
        delta: "Hi",
      },
      {
        event: "turn_completed",
        schema_version: PAM_V2_SCHEMA_VERSION,
        trace_id: "t1",
        sequence: 2,
        conversation_id: "conv-1",
        client_message_id: "cm-1",
        finish_reason: "completed",
      },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeResponse(events.map(sseLine)));

    const onEvent = vi.fn();
    const onError = vi.fn();

    await streamTurn({
      message: "Hello",
      conversationId: "conv-1",
      clientMessageId: "cm-1",
      authToken: "token-1",
      onEvent,
      onError,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v2/pam/turn"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
          Accept: "text/event-stream",
        }),
        body: expect.stringContaining("Hello"),
      }),
    );
    expect(onEvent).toHaveBeenCalledWith({
      type: "TEXT_DELTA",
      payload: { delta: "Hi" },
    });
    expect(onEvent).toHaveBeenCalledWith({
      type: "TURN_COMPLETED",
      payload: { finishReason: "completed" },
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("handles tool events", async () => {
    const events = [
      {
        event: "tool_started",
        schema_version: PAM_V2_SCHEMA_VERSION,
        trace_id: "t1",
        sequence: 1,
        tool_call_id: "tc-1",
        tool_name: "get_weather",
        namespace: "travel",
      },
      {
        event: "tool_completed",
        schema_version: PAM_V2_SCHEMA_VERSION,
        trace_id: "t1",
        sequence: 2,
        tool_call_id: "tc-1",
        tool_name: "get_weather",
        status: "success",
        result_summary: "Sunny",
      },
      {
        event: "turn_completed",
        schema_version: PAM_V2_SCHEMA_VERSION,
        trace_id: "t1",
        sequence: 3,
        conversation_id: "conv-1",
        client_message_id: "cm-1",
        finish_reason: "completed",
      },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeResponse(events.map(sseLine)));

    const onEvent = vi.fn();
    await streamTurn({
      message: "Weather?",
      conversationId: "conv-1",
      authToken: "token-1",
      onEvent,
      onError: vi.fn(),
    });

    expect(onEvent).toHaveBeenCalledWith({
      type: "TOOL_STARTED",
      payload: { toolCallId: "tc-1", toolName: "get_weather" },
    });
    expect(onEvent).toHaveBeenCalledWith({
      type: "TOOL_COMPLETED",
      payload: {
        toolCallId: "tc-1",
        toolName: "get_weather",
        status: "success",
        resultSummary: "Sunny",
      },
    });
  });

  it("calls onError for HTTP errors", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ code: "model_not_configured", message: "Model not configured" }),
    } as Response);

    const onError = vi.fn();
    await streamTurn({
      message: "Hi",
      conversationId: "conv-1",
      authToken: "token-1",
      onEvent: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledWith(new Error("Model not configured"));
  });

  it("calls onError for schema version mismatch", async () => {
    const events = [
      {
        event: "text_delta",
        schema_version: "old-version",
        trace_id: "t1",
        sequence: 1,
        delta: "Hi",
      },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeResponse(events.map(sseLine)));

    const onError = vi.fn();
    await streamTurn({
      message: "Hi",
      conversationId: "conv-1",
      authToken: "token-1",
      onEvent: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Unsupported schema version"),
      }),
    );
  });

  it("does not call onError when aborted", async () => {
    const ctrl = new AbortController();
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (_url, options) => {
      if (options?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      return makeResponse([]);
    });

    const onError = vi.fn();
    ctrl.abort();
    await streamTurn({
      message: "Hi",
      conversationId: "conv-1",
      authToken: "token-1",
      onEvent: vi.fn(),
      onError,
      signal: ctrl.signal,
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it("sends approval_token when provided", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeResponse([]));
    await streamTurn({
      message: "",
      conversationId: "conv-1",
      approvalToken: "approval-1",
      authToken: "token-1",
      onEvent: vi.fn(),
      onError: vi.fn(),
    });

    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(callBody.approval_token).toBe("approval-1");
  });
});
