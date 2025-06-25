
import React from 'react';
import PamAssistantEnhanced from '@/components/PamAssistantEnhanced';

const PamSidebar: React.FC = () => {
  return (
    <div className="fixed right-0 top-32 h-[calc(100vh-8rem)] w-80 bg-white border-l border-gray-200 shadow-lg z-30">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <PamAssistantEnhanced />
        </div>
      </div>
    </div>
  );
};

export default PamSidebar;
