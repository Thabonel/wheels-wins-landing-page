
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, X } from 'lucide-react';
import PamAssistant from "@/components/PamAssistant";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminPamChatProps {
  isPamChatOpen: boolean;
  setIsPamChatOpen: (open: boolean) => void;
}

const AdminPamChat: React.FC<AdminPamChatProps> = ({ isPamChatOpen, setIsPamChatOpen }) => {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Desktop PAM Chat */}
      {!isMobile && (
        <div className="fixed bottom-6 right-6 z-40">
          {isPamChatOpen ? (
            <div className="w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Admin PAM Assistant</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPamChatOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <PamAssistant />
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsPamChatOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          )}
        </div>
      )}

      {/* Mobile PAM Chat */}
      {isMobile && (
        <div className="fixed bottom-4 right-4 z-40">
          {isPamChatOpen ? (
            <div className="fixed inset-4 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Admin PAM Assistant</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPamChatOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <PamAssistant />
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsPamChatOpen(true)}
              className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}
    </>
  );
};

export default AdminPamChat;
