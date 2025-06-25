
import React from 'react';
import PamAssistant from '@/components/PamAssistant';

const PamSidebar: React.FC = () => {
  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-white border-l border-gray-200 shadow-lg z-30">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <PamAssistant />
        </div>
      </div>
    </div>
  );
};

export default PamSidebar;
