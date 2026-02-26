import type { Session } from '@supabase/supabase-js';

const STORAGE_KEY = 'pam-auth-token';

interface StoredSessionPayload {
  currentSession?: Session | null;
  expiresAt?: number | null;
}

let cachedSession: Session | null = null;
let cachedToken: string | null = null;
let hydratedFromStorage = false;

const hydrateFromStorage = () => {
  if (hydratedFromStorage || typeof window === 'undefined') {
    return;
  }

  hydratedFromStorage = true;

  // Check if we're in iOS PWA mode with storage isolation
  const isPWAStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  if (isPWAStandalone && isIOSDevice) {
    console.warn('[AuthSessionManager] iOS PWA storage isolation detected - skipping localStorage hydration');
    // In iOS PWA mode, don't try to hydrate from localStorage as it's isolated
    return;
  }

  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          raw = window.localStorage.getItem(key);
          if (raw) {
            break;
          }
        }
      }
    }

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as StoredSessionPayload | undefined;
    const session = parsed?.currentSession;

    if (session?.access_token) {
      cachedSession = session;
      cachedToken = session.access_token;
    }
  } catch (error) {
    console.warn('[AuthSessionManager] Failed to hydrate session from storage:', error);
  }
};

export const authSessionManager = {
  setSession(session: Session | null) {
    hydratedFromStorage = true;
    cachedSession = session;
    cachedToken = session?.access_token ?? null;
  },

  clearSession() {
    hydratedFromStorage = true;
    cachedSession = null;
    cachedToken = null;
  },

  getSession(): Session | null {
    if (!cachedSession) {
      hydrateFromStorage();
    }
    return cachedSession;
  },

  getToken(): string | null {
    if (!cachedToken) {
      hydrateFromStorage();
    }
    return cachedToken;
  },

  getUserId(): string | null {
    return this.getSession()?.user?.id ?? null;
  }
};
