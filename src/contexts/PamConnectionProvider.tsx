import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import pamService, { type ConnectionStatus, type PamApiResponse } from "@/services/pamService";
import { type PamApiMessage } from "@/types/pamContext";

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

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (user?.id && session?.access_token) {
      connect();
    }
    return () => {
      pamService.disconnect();
    };
  }, [user?.id, session?.access_token]);

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

