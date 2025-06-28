
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { Loader2 } from "lucide-react";
import { useRegion } from "@/context/RegionContext";
import { useOffline } from "@/context/OfflineContext";
import { getQuickReplies } from "./chatUtils";
import { ChatMessage } from "./types";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import QuickReplies from "./QuickReplies";
import OfflinePamChat from "./OfflinePamChat";
import PamConnectionStatus from "./PamConnectionStatus";
import PamQuickActions from "./PamQuickActions";

interface PamMobileChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isProcessing: boolean;
  isConnected: boolean;
  onSendMessage: (message: string) => void;
  onQuickAction: (action: string) => void;
}

const PamMobileChat = ({
  isOpen,
  onClose,
  messages,
  isProcessing,
  isConnected,
  onSendMessage,
  onQuickAction
}: PamMobileChatProps) => {
  const { region } = useRegion();
  const { isOffline } = useOffline();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-sm h-[80vh] rounded-xl shadow-xl bg-white border border-blue-100 flex flex-col overflow-hidden">
      {/* Enhanced Header with Connection Status */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <img src={getPublicAssetUrl('Pam.webp')} alt="Pam" />
            </Avatar>
            <div>
              <h3 className="font-bold">Chat with Pam</h3>
              <p className="text-xs opacity-90">
                Your {region} AI Assistant {!isConnected && '(Demo Mode)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PamConnectionStatus isConnected={isConnected} />
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              ×
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {isOffline ? (
          <OfflinePamChat />
        ) : (
          <>
            <ChatMessages messages={messages} />
            
            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-3 mx-4">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-600">PAM is thinking...</span>
              </div>
            )}
            
            <div className="px-4 pb-2">
              <PamQuickActions
                onQuickAction={onQuickAction}
                isProcessing={isProcessing}
                isConnected={isConnected}
              />
              
              <QuickReplies 
                replies={getQuickReplies(region)} 
                onReplyClick={onSendMessage} 
                region={region} 
              />
            </div>
            
            <ChatInput 
              onSendMessage={onSendMessage} 
              isConnected={isConnected}
              isProcessing={isProcessing}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PamMobileChat;
