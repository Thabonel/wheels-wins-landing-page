import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import pamService, { type ConnectionStatus, type PamApiMessage, type PamApiResponse } from "@/services/pamService";

interface PamConnectionContextValue {
  status: ConnectionStatus;
  isReady: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendMessage: (message: string, context?: PamApiMessage["context"]) => Promise<PamApiResponse>;
  getSessionId: () => string | null;
}

const PamConnectionContext = createContext<PamConnectionContextValue | undefined>(undefined);

export function PamConnectionProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>(pamService.getStatus());

  // Subscribe to pamService status changes
  useEffect(() => {
    const unsubscribe = pamService.onStatusChange(setStatus);
    return () => unsubscribe();
  }, []);

  const connect = useCallback(async () => {
    if (!user?.id || !session?.access_token) return false;
    const expiresAt = session.expires_at ?? undefined;
    return pamService.connect(user.id, session.access_token, expiresAt);
  }, [user?.id, session?.access_token, session?.expires_at]);

  const disconnect = useCallback(() => {
    pamService.disconnect();
  }, []);

  // AUTO-CONNECT DISABLED - PAM now uses OpenAI Realtime (voice only)
  // Keep provider for backward compatibility with usePamConnection hook
  useEffect(() => {
    // DO NOT auto-connect to Claude WebSocket
    // Voice mode uses OpenAI Realtime API instead
    return () => {
      // Cleanup on unmount
      pamService.disconnect();
    };
  }, []);

  const sendMessage = useCallback(
    async (message: string, context?: PamApiMessage["context"]) => {
      if (!user?.id) {
        return { error: "No user session", message: "Please sign in first." } as PamApiResponse;
      }
      return pamService.sendMessage({ message, user_id: user.id, context });
    },
    [user?.id]
  );

  const value = useMemo<PamConnectionContextValue>(() => ({
    status,
    isReady: status.isConnected && !status.isConnecting,
    connect,
    disconnect,
    sendMessage,
    getSessionId: () => pamService.getSessionId(),
  }), [status, connect, disconnect, sendMessage]);

  return (
    <PamConnectionContext.Provider value={value}>
      {children}
    </PamConnectionContext.Provider>
  );
}

export function usePamConnection() {
  const ctx = useContext(PamConnectionContext);
  if (!ctx) throw new Error("usePamConnection must be used within PamConnectionProvider");
  return ctx;
}

