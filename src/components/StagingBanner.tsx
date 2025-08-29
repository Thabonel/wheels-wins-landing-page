import { useState } from 'react';
import { X } from 'lucide-react';

export function StagingBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const isStaging = import.meta.env.VITE_ENVIRONMENT === 'staging';
  const showBanner = import.meta.env.VITE_SHOW_STAGING_BANNER === 'true';

  if (!isStaging || !showBanner || !isVisible) {
    return null;
  }

  return (
    <div className="bg-yellow-400 text-black px-4 py-2 text-center relative">
      <div className="flex items-center justify-center gap-2">
        <span className="font-semibold">⚠️ STAGING ENVIRONMENT</span>
        <span className="text-sm">
          This is a test site. Data may be reset without notice.
        </span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-700"
        aria-label="Close staging banner"
      >
        <X size={16} />
      </button>
    </div>
  );
}