import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createInitialState, v2ChatReducer, type V2ChatAction, type V2ChatState } from "./pamV2Reducer";
import { streamTurn } from "./pamV2Transport";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function usePamV2Chat() {
  const { token, isAuthenticated } = useAuth();
  const [state, dispatch] = useReducer(v2ChatReducer, null, createInitialState);
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setReady(isAuthenticated && !!token);
  }, [isAuthenticated, token]);

  const runStream = useCallback(
    async (content: string, clientMessageId: string, approvalToken?: string) => {
      const authToken = token;
      if (!authToken) {
        dispatch({
          type: "ERROR",
          payload: { code: "not_authenticated", message: "Please sign in to chat with Pam." },
        });
        return;
      }

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        await streamTurn({
          message: content,
          conversationId: stateRef.current.conversationId,
          clientMessageId,
          approvalToken,
          authToken,
          onEvent: dispatch,
          onError: (err) =>
            dispatch({
              type: "ERROR",
              payload: { code: "client_error", message: err.message },
            }),
          signal: ctrl.signal,
        });
      } finally {
        abortRef.current = null;
      }
    },
    [token],
  );

  const sendMessage = useCallback(
    async (content: string, approvalToken?: string) => {
      if (stateRef.current.streaming) return;
      const trimmed = content.trim();
      if (!trimmed && !approvalToken) return;

      const clientMessageId = generateId();
      dispatch({
        type: "ADD_USER_MESSAGE",
        payload: {
          userMessageId: clientMessageId,
          assistantMessageId: generateId(),
          content: trimmed,
        },
      });

      await runStream(trimmed, clientMessageId, approvalToken);
    },
    [runStream],
  );

  const approve = useCallback(
    async (approvalToken: string) => {
      dispatch({
        type: "APPROVAL_RESPONSE",
        payload: { approvalToken, response: "approved" },
      });
      await sendMessage("", approvalToken);
    },
    [sendMessage],
  );

  const reject = useCallback((approvalToken: string) => {
    dispatch({
      type: "APPROVAL_RESPONSE",
      payload: { approvalToken, response: "rejected" },
    });
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const clearChat = useCallback(() => {
    cancel();
    dispatch({ type: "RESET" });
  }, [cancel]);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return {
    state,
    sendMessage,
    approve,
    reject,
    cancel,
    clearChat,
    clearError,
    ready,
  };
}
