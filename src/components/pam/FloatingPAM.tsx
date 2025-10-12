/**
 * Floating PAM Assistant - Available on all pages
 * Opens SimplePAM in a floating dialog
 */

import React, { useState } from 'react';
import { MessageCircle, X, AlertCircle } from 'lucide-react';
import { SimplePAM } from './SimplePAM';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FloatingPAMProps {
  page?: string;
}

export const FloatingPAM: React.FC<FloatingPAMProps> = ({ page = 'app' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, token } = useAuth();

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        size="icon"
        data-testid="floating-pam-button"
        aria-label="Open PAM Assistant"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      {/* PAM Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] h-[600px] p-0" data-testid="floating-pam-dialog">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>PAM Assistant</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-4 pb-4">
            {!user || !token ? (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please log in to use PAM Assistant. PAM requires authentication to access your personalized data.
                </AlertDescription>
              </Alert>
            ) : (
              <SimplePAM
                enableVoice={false}
                className="h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
