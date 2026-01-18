/**
 * PAM Help Button - Contextual assistance anywhere in the app
 * Simple, elegant, and intelligently positioned
 */

import React, { useState } from 'react';
import { HelpCircle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
// TEMP: usePamAssistant removed during cleanup (used deleted PamContext)
// import { usePamAssistant } from '@/hooks/pam/usePamAssistant';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logger } from '../../lib/logger';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PamHelpButtonProps {
  page: string;
  context?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'floating';
}

export const PamHelpButton: React.FC<PamHelpButtonProps> = ({
  page,
  context,
  className,
  size = 'md',
  variant = 'default'
}) => {
  // TEMP: Disabled during cleanup - needs refactor to use pamService.ts instead
  // const { getHelp, isReady, isLoading } = usePamAssistant();
  const isReady = false; // Temporarily disabled
  const isLoading = false;
  const [isOpen, setIsOpen] = useState(false);
  const [helpText, setHelpText] = useState<string>('');
  const [isGettingHelp, setIsGettingHelp] = useState(false);

  const handleGetHelp = async () => {
    if (!isReady || isGettingHelp) return;

    try {
      setIsGettingHelp(true);
      // TEMP: Disabled during cleanup
      // const help = await getHelp(page, context);
      const help = "PAM Help is temporarily unavailable during cleanup. Please use the main PAM chat.";
      setHelpText(help);
      setIsOpen(true);
    } catch (error) {
      logger.error('Failed to get help:', error);
      setHelpText("I'm having trouble providing help right now. Please try again later.");
      setIsOpen(true);
    } finally {
      setIsGettingHelp(false);
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18
  };

  if (!isReady && !isLoading) {
    return null; // Hide if PAM is not available
  }

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleGetHelp}
              disabled={!isReady || isGettingHelp}
              className={cn(
                "inline-flex items-center justify-center rounded-full",
                "text-gray-400 hover:text-blue-500 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                sizeClasses[size],
                className
              )}
            >
              {isGettingHelp ? (
                <Loader2 size={iconSizes[size]} className="animate-spin" />
              ) : (
                <HelpCircle size={iconSizes[size]} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ask PAM for help</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'floating') {
    return (
      <div className={cn("fixed bottom-24 right-6 z-40", className)}>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={handleGetHelp}
              disabled={!isReady || isGettingHelp}
              className={cn(
                "flex items-center justify-center rounded-full shadow-lg",
                "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600",
                "text-white transition-all duration-200 hover:scale-105",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                sizeClasses[size]
              )}
            >
              {isGettingHelp ? (
                <Loader2 size={iconSizes[size]} className="animate-spin" />
              ) : (
                <Sparkles size={iconSizes[size]} />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 p-4 mr-4 mb-2" 
            side="top" 
            align="end"
          >
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">PAM Assistant</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {helpText || `I can help you with the ${page} section. Click to get personalized assistance!`}
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Default variant
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={handleGetHelp}
          disabled={!isReady || isGettingHelp}
          className={cn(
            "inline-flex items-center space-x-2 px-3 py-2 rounded-lg",
            "bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100",
            "border border-blue-200 hover:border-blue-300",
            "text-blue-700 hover:text-blue-800 transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "dark:from-blue-900/20 dark:to-purple-900/20",
            "dark:border-blue-700 dark:text-blue-300",
            className
          )}
        >
          {isGettingHelp ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span className="text-sm font-medium">Ask PAM</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" side="bottom" align="center">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span>PAM Assistant</span>
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {helpText || `I'm ready to help you with the ${page} section. What would you like to know?`}
          </p>
          {helpText && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};