import { describe, it, expect, vi } from "vitest";
import {
  createInitialState,
  v2ChatReducer,
  eventToAction,
  type V2ChatState,
} from "../pamV2Reducer";
import type {
  TextDeltaEvent,
  ToolStartedEvent,
  ToolCompletedEvent,
  ApprovalRequiredEvent,
  TurnCompletedEvent,
  ErrorEvent,
  ActionEvent,
} from "@/types/pamV2";

const baseEvent = {
  schema_version: "2026-06-16",
  trace_id: "trace-1",
  sequence: 1,
};

function sendUserMessage(
  state: V2ChatState,
  content: string,
  ids = { user: "user-1", assistant: "assistant-1" },
) {
  return v2ChatReducer(state, {
    type: "ADD_USER_MESSAGE",
    payload: {
      userMessageId: ids.user,
      assistantMessageId: ids.assistant,
      content,
    },
  });
}

describe("v2ChatReducer", () => {
  it("creates an initial empty state", () => {
    const state = createInitialState();
    expect(state.messages).toEqual([]);
    expect(state.streaming).toBe(false);
    expect(state.conversationId).toBeDefined();
  });

  it("adds user message and a pending assistant placeholder", () => {
    const state = sendUserMessage(createInitialState(), "Hello");
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]).toMatchObject({
      id: "user-1",
      role: "user",
      content: "Hello",
    });
    expect(state.messages[1]).toMatchObject({
      id: "assistant-1",
      role: "assistant",
      content: "",
      pending: true,
    });
    expect(state.streaming).toBe(true);
  });

  it("appends text deltas to the pending assistant message", () => {
    let state = sendUserMessage(createInitialState(), "Hi");
    state = v2ChatReducer(state, {
      type: "TEXT_DELTA",
      payload: { delta: "Hello " },
    });
    state = v2ChatReducer(state, {
      type: "TEXT_DELTA",
      payload: { delta: "there" },
    });
    expect(state.messages[1].content).toBe("Hello there");
  });

  it("ignores deltas when there is no pending assistant message", () => {
    const state = v2ChatReducer(createInitialState(), {
      type: "TEXT_DELTA",
      payload: { delta: "ignored" },
    });
    expect(state.messages).toHaveLength(0);
  });

  it("tracks tool calls on the pending assistant message", () => {
    let state = sendUserMessage(createInitialState(), "Plan trip");
    state = v2ChatReducer(state, {
      type: "TOOL_STARTED",
      payload: { toolCallId: "tc-1", toolName: "plan_trip" },
    });
    expect(state.messages[1].toolCalls).toHaveLength(1);
    expect(state.messages[1].toolCalls![0]).toMatchObject({
      id: "tc-1",
      name: "plan_trip",
      status: "running",
    });

    state = v2ChatReducer(state, {
      type: "TOOL_COMPLETED",
      payload: {
        toolCallId: "tc-1",
        toolName: "plan_trip",
        status: "success",
        resultSummary: "Route ready",
      },
    });
    expect(state.messages[1].toolCalls![0]).toMatchObject({
      status: "success",
      summary: "Route ready",
    });
  });

  it("records an approval request and marks the assistant message not pending", () => {
    let state = sendUserMessage(createInitialState(), "Add event");
    state = v2ChatReducer(state, {
      type: "APPROVAL_REQUIRED",
      payload: {
        approvalToken: "token-1",
        actionType: "calendar_event",
        actionSummary: "Create calendar event: Dinner",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
    expect(state.messages[1].pending).toBe(false);
    expect(state.messages[1].approval).toMatchObject({
      token: "token-1",
      actionType: "calendar_event",
      status: "pending",
    });
  });

  it("updates approval status on approve/reject", () => {
    let state = sendUserMessage(createInitialState(), "Add event");
    state = v2ChatReducer(state, {
      type: "APPROVAL_REQUIRED",
      payload: {
        approvalToken: "token-1",
        actionType: "calendar_event",
        actionSummary: "Create calendar event: Dinner",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
    state = v2ChatReducer(state, {
      type: "APPROVAL_RESPONSE",
      payload: { approvalToken: "token-1", response: "approved" },
    });
    expect(state.messages[1].approval?.status).toBe("approved");

    state = v2ChatReducer(state, {
      type: "APPROVAL_RESPONSE",
      payload: { approvalToken: "token-1", response: "rejected" },
    });
    expect(state.messages[1].approval?.status).toBe("rejected");
  });

  it("attaches action cards to the last assistant message", () => {
    let state = sendUserMessage(createInitialState(), "Plan trip");
    state = v2ChatReducer(state, {
      type: "ACTION",
      payload: {
        actionType: "trip_planned",
        payload: { title: "Great Ocean Road", destination: "Apollo Bay" },
      },
    });
    expect(state.messages[1].actions).toHaveLength(1);
    expect(state.messages[1].actions![0].actionType).toBe("trip_planned");
  });

  it("completes a turn and clears streaming", () => {
    let state = sendUserMessage(createInitialState(), "Hi");
    state = v2ChatReducer(state, {
      type: "TURN_COMPLETED",
      payload: { finishReason: "completed" },
    });
    expect(state.messages[1].pending).toBe(false);
    expect(state.streaming).toBe(false);
  });

  it("records errors and marks the assistant message not pending", () => {
    let state = sendUserMessage(createInitialState(), "Hi");
    state = v2ChatReducer(state, {
      type: "ERROR",
      payload: { code: "runtime_error", message: "Something went wrong" },
    });
    expect(state.messages[1].pending).toBe(false);
    expect(state.streaming).toBe(false);
    expect(state.error).toBe("Something went wrong");
  });

  it("clears errors", () => {
    let state = sendUserMessage(createInitialState(), "Hi");
    state = v2ChatReducer(state, {
      type: "ERROR",
      payload: { code: "x", message: "bad" },
    });
    state = v2ChatReducer(state, { type: "CLEAR_ERROR" });
    expect(state.error).toBeUndefined();
  });

  it("resets to a fresh conversation", () => {
    let state = sendUserMessage(createInitialState(), "Hi");
    state = v2ChatReducer(state, { type: "RESET" });
    expect(state.messages).toHaveLength(0);
    expect(state.streaming).toBe(false);
    expect(state.error).toBeUndefined();
  });
});

describe("eventToAction", () => {
  it("maps text_delta", () => {
    const event: TextDeltaEvent = {
      event: "text_delta",
      ...baseEvent,
      delta: "hi",
    };
    expect(eventToAction(event)).toEqual({
      type: "TEXT_DELTA",
      payload: { delta: "hi" },
    });
  });

  it("maps tool_started and tool_completed", () => {
    const started: ToolStartedEvent = {
      event: "tool_started",
      ...baseEvent,
      tool_call_id: "tc-1",
      tool_name: "get_weather",
      namespace: "travel",
    };
    expect(eventToAction(started)).toEqual({
      type: "TOOL_STARTED",
      payload: { toolCallId: "tc-1", toolName: "get_weather" },
    });

    const completed: ToolCompletedEvent = {
      event: "tool_completed",
      ...baseEvent,
      tool_call_id: "tc-1",
      tool_name: "get_weather",
      status: "success",
      result_summary: "Sunny",
    };
    expect(eventToAction(completed)).toEqual({
      type: "TOOL_COMPLETED",
      payload: {
        toolCallId: "tc-1",
        toolName: "get_weather",
        status: "success",
        resultSummary: "Sunny",
      },
    });
  });

  it("maps approval_required", () => {
    const event: ApprovalRequiredEvent = {
      event: "approval_required",
      ...baseEvent,
      approval_token: "token-1",
      action_type: "calendar_event",
      action_summary: "Create event",
      expires_at: "2026-01-01T00:00:00Z",
    };
    expect(eventToAction(event)).toEqual({
      type: "APPROVAL_REQUIRED",
      payload: {
        approvalToken: "token-1",
        actionType: "calendar_event",
        actionSummary: "Create event",
        expiresAt: "2026-01-01T00:00:00Z",
      },
    });
  });

  it("maps turn_completed", () => {
    const event: TurnCompletedEvent = {
      event: "turn_completed",
      ...baseEvent,
      conversation_id: "conv-1",
      client_message_id: "cm-1",
      finish_reason: "completed",
    };
    expect(eventToAction(event)).toEqual({
      type: "TURN_COMPLETED",
      payload: { finishReason: "completed" },
    });
  });

  it("maps error", () => {
    const event: ErrorEvent = {
      event: "error",
      ...baseEvent,
      code: "bad",
      message: "bad things",
    };
    expect(eventToAction(event)).toEqual({
      type: "ERROR",
      payload: { code: "bad", message: "bad things" },
    });
  });

  it("maps action events", () => {
    const event: ActionEvent = {
      event: "action",
      ...baseEvent,
      action_type: "expense",
      payload: { amount: 12 },
    };
    expect(eventToAction(event)).toEqual({
      type: "ACTION",
      payload: { actionType: "expense", payload: { amount: 12 } },
    });
  });
});
