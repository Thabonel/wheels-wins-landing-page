/**
 * Pam V2 client/server contracts.
 *
 * Keep in sync with backend/app/models/schemas/pam_v2.py.
 */

export const PAM_V2_SCHEMA_VERSION = "2026-06-16";

export type PamChannel = "text" | "voice";

export interface PamTurnRequestV2 {
  conversation_id: string;
  client_message_id: string;
  message: string;
  channel: PamChannel;
  locale: string;
  timezone: string;
  approval_token?: string | null;
}

export interface PamEventBase {
  event: string;
  schema_version: string;
  trace_id: string;
  sequence: number;
}

export interface TurnStartedEvent extends PamEventBase {
  event: "turn_started";
  conversation_id: string;
  client_message_id: string;
}

export interface TextDeltaEvent extends PamEventBase {
  event: "text_delta";
  delta: string;
}

export interface ToolStartedEvent extends PamEventBase {
  event: "tool_started";
  tool_call_id: string;
  tool_name: string;
  namespace: string;
}

export type ToolCompletionStatus = "success" | "error" | "blocked";

export interface ToolCompletedEvent extends PamEventBase {
  event: "tool_completed";
  tool_call_id: string;
  tool_name: string;
  status: ToolCompletionStatus;
  result_summary?: string | null;
}

export interface ApprovalRequiredEvent extends PamEventBase {
  event: "approval_required";
  approval_token: string;
  action_type: string;
  action_summary: string;
  expires_at: string; // ISO 8601
}

export interface ActionEvent extends PamEventBase {
  event: "action";
  action_type: string;
  payload: Record<string, unknown>;
}

export type FinishReason = "completed" | "error" | "max_iterations" | "timeout";

export interface TurnCompletedEvent extends PamEventBase {
  event: "turn_completed";
  conversation_id: string;
  client_message_id: string;
  finish_reason: FinishReason;
}

export interface ErrorEvent extends PamEventBase {
  event: "error";
  code: string;
  message: string;
}

export type PamEventV2 =
  | TurnStartedEvent
  | TextDeltaEvent
  | ToolStartedEvent
  | ToolCompletedEvent
  | ApprovalRequiredEvent
  | ActionEvent
  | TurnCompletedEvent
  | ErrorEvent;

export interface PamHealthResponseV2 {
  status: "ok" | "degraded" | "unavailable";
  schema_version: string;
  pam_v2_enabled: boolean;
  provider: string | null;
  model: string | null;
  environment: string;
  timestamp: string; // ISO 8601
}

export interface PamV2ErrorDetail {
  error: "error";
  code: string;
  message: string;
  trace_id?: string | null;
  schema_version: string;
}
