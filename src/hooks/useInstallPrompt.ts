import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptState {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  showPrompt: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SHOW_DELAY_MS = 30_000; // 30 seconds after page load

export function useInstallPrompt(): InstallPromptState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  const wasDismissedRecently = useCallback(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const elapsed = Date.now() - parseInt(dismissed, 10);
    return elapsed < DISMISS_DURATION_MS;
  }, []);

  useEffect(() => {
    if (isStandalone || wasDismissedRecently()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // On iOS there's no beforeinstallprompt - show manual instructions after delay
    if (isIOS) {
      setCanInstall(true);
    }

    // Delay showing the prompt so users aren't hit immediately
    const timer = setTimeout(() => {
      if (!wasDismissedRecently()) {
        setShowPrompt(true);
      }
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [isStandalone, isIOS, wasDismissedRecently]);

  const install = useCallback(async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
        setShowPrompt(false);
      }
      deferredPrompt.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowPrompt(false);
  }, []);

  return {
    canInstall: canInstall && !isStandalone,
    isIOS,
    isStandalone,
    showPrompt: showPrompt && canInstall && !isStandalone,
    install,
    dismiss,
  };
}
