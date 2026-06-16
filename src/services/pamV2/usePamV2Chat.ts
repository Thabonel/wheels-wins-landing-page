import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import {
  V2ChatState,
  V2ChatMessage,
  createInitialState,
  v2ChatReducer,
  streamTurn,
} from "./pamV2Client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function usePamV2Chat() {
  const [state, dispatch] = useReducer(v2ChatReducer, null, createInitialState);
  const abortRef = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session?.access_token);
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string, approvalToken?: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const id = crypto.randomUUID();
      dispatch({ type: "ADD_USER_MESSAGE", payload: { id, content } });

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      await streamTurn({
        message: content,
        conversationId: state.conversationId,
        clientMessageId: id,
        approvalToken,
        authToken: token,
        onEvent: dispatch,
        onError: (err) =>
          dispatch({
            type: "ERROR",
            payload: { event: "error", message: err.message, code: "client_error", schema_version: "2026-06-16", trace_id: "", sequence: 0 },
          }),
        signal: ctrl.signal,
      });

      abortRef.current = null;
    },
    [state.conversationId],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const clearChat = useCallback(() => {
    cancel();
    dispatch({ type: "TURN_COMPLETED", payload: { finish_reason: "completed" } });
    // HACK: force state reset by creating fresh state
    location.reload();
  }, [cancel]);

  return { state, sendMessage, cancel, clearChat, ready };
}
