import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePamV2Chat } from "../usePamV2Chat";
import { useAuth } from "@/context/AuthContext";
import { PAM_V2_SCHEMA_VERSION } from "@/types/pamV2";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

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

function makeResponse(chunks: string[]) {
  return { ok: true, status: 200, ...createMockStream(chunks) } as unknown as Response;
}

function sseLine(event: Record<string, unknown>) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

describe("usePamV2Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      token: "token-1",
      isAuthenticated: true,
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("is ready when authenticated", () => {
    const { result } = renderHook(() => usePamV2Chat());
    expect(result.current.ready).toBe(true);
  });

  it("is not ready when unauthenticated", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      token: null,
      isAuthenticated: false,
    });
    const { result } = renderHook(() => usePamV2Chat());
    expect(result.current.ready).toBe(false);
  });

  it("sends a message and streams the response", async () => {
    const events = [
      { event: "text_delta", schema_version: PAM_V2_SCHEMA_VERSION, trace_id: "t1", sequence: 1, delta: "Hello" },
      { event: "turn_completed", schema_version: PAM_V2_SCHEMA_VERSION, trace_id: "t1", sequence: 2, conversation_id: "conv-1", client_message_id: "cm-1", finish_reason: "completed" },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeResponse(events.map(sseLine)));

    const { result } = renderHook(() => usePamV2Chat());

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    expect(result.current.state.messages).toHaveLength(2);
    expect(result.current.state.messages[0].role).toBe("user");
    expect(result.current.state.messages[1].role).toBe("assistant");
    expect(result.current.state.messages[1].content).toBe("Hello");
    expect(result.current.state.streaming).toBe(false);
  });

  it("approves a pending action", async () => {
    const events = [
      {
        event: "approval_required",
        schema_version: PAM_V2_SCHEMA_VERSION,
        trace_id: "t1",
        sequence: 1,
        approval_token: "token-a",
        action_type: "calendar_event",
        action_summary: "Create event",
        expires_at: "2026-01-01T00:00:00Z",
      },
      { event: "turn_completed", schema_version: PAM_V2_SCHEMA_VERSION, trace_id: "t1", sequence: 2, conversation_id: "conv-1", client_message_id: "cm-1", finish_reason: "completed" },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeResponse(events.map(sseLine)));

    const { result } = renderHook(() => usePamV2Chat());

    await act(async () => {
      await result.current.sendMessage("Add event");
    });

    expect(result.current.state.messages[1].approval?.status).toBe("pending");

    await act(async () => {
      await result.current.approve("token-a");
    });

    expect(result.current.state.messages[1].approval?.status).toBe("approved");
    const callBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body);
    expect(callBody.approval_token).toBe("token-a");
  });

  it("rejects a pending action without calling the server", async () => {
    const events = [
      {
        event: "approval_required",
        schema_version: PAM_V2_SCHEMA_VERSION,
        trace_id: "t1",
        sequence: 1,
        approval_token: "token-a",
        action_type: "calendar_event",
        action_summary: "Create event",
        expires_at: "2026-01-01T00:00:00Z",
      },
      { event: "turn_completed", schema_version: PAM_V2_SCHEMA_VERSION, trace_id: "t1", sequence: 2, conversation_id: "conv-1", client_message_id: "cm-1", finish_reason: "completed" },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeResponse(events.map(sseLine)));

    const { result } = renderHook(() => usePamV2Chat());

    await act(async () => {
      await result.current.sendMessage("Add event");
    });

    await act(async () => {
      result.current.reject("token-a");
    });

    expect(result.current.state.messages[1].approval?.status).toBe("rejected");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears the conversation", async () => {
    const events = [
      { event: "text_delta", schema_version: PAM_V2_SCHEMA_VERSION, trace_id: "t1", sequence: 1, delta: "Hello" },
      { event: "turn_completed", schema_version: PAM_V2_SCHEMA_VERSION, trace_id: "t1", sequence: 2, conversation_id: "conv-1", client_message_id: "cm-1", finish_reason: "completed" },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeResponse(events.map(sseLine)));

    const { result } = renderHook(() => usePamV2Chat());
    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.state.messages).toHaveLength(0);
    expect(result.current.state.streaming).toBe(false);
  });
});
