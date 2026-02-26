import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { X } from 'lucide-react';

export function InstallPrompt() {
  const { showPrompt, isIOS, install, dismiss } = useInstallPrompt();

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-4 shadow-lg dark:border-stone-700 dark:bg-stone-900">
        <div className="flex items-start gap-3">
          <img
            src="/icons/pam-avatar.webp"
            alt=""
            className="h-10 w-10 rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Add Wheels & Wins to your home screen
            </p>
{isIOS ? (
              <>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                  Tap the share button, then "Add to Home Screen" for the full app experience.
                </p>
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Note: You'll need to log in again after installing as an app.
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                  Get quick access, offline support, and a full-screen experience.
                </p>
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Note: You may need to log in again after installation.
                </p>
              </>
            )}

            {!isIOS && (
              <button
                onClick={install}
                className="mt-3 w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 active:bg-stone-900 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-stone-300"
              >
                Install App
              </button>
            )}
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
