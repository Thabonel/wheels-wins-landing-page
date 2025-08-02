import React from 'react';
import { MessageSquare, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePamLoading } from './LazyPamIntegrationProvider';

const PamTrigger: React.FC = () => {
  const { isPamLoaded, loadPam } = usePamLoading();

  if (isPamLoaded) {
    return null; // PAM is loaded, hide the trigger
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={loadPam}
        size="lg"
        className="rounded-full h-16 w-16 shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
        aria-label="Load PAM Assistant"
      >
        <div className="relative">
          <MessageSquare className="h-6 w-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </Button>
      
      {/* Tooltip */}
      <div className="absolute bottom-20 right-0 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Click to load PAM Assistant
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

export default PamTrigger;