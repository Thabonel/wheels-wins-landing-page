import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PamAssistantEnhanced from '@/components/PamAssistantEnhanced';

const PamSidebar: React.FC = () => {
  const { user: authUser } = useAuth();

  // Don't render if no authenticated user
  if (!authUser?.id) {
    return null;
  }

  return (
    <div className="fixed right-0 top-32 h-[calc(100vh-8rem)] w-80 bg-white border-l border-gray-200 shadow-lg z-30">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <PamAssistantEnhanced 
            userId={authUser.id} 
            authToken={authUser.access_token || ""} 
          />
        </div>
      </div>
    </div>
  );
};

export default PamSidebar;
