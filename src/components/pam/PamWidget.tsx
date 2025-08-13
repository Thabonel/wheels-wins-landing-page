/**
 * PAM Widget - Elegant floating AI assistant
 * Minimalist design with intelligent positioning and smooth animations
 */

import React, { useState, useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PamInterface } from './PamInterface';

interface PamWidgetProps {
  className?: string;
  initialOpen?: boolean;
}

export const PamWidget: React.FC<PamWidgetProps> = ({ 
  className, 
  initialOpen = false 
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isVisible, setIsVisible] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Handle scroll to hide/show widget intelligently
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Hide when scrolling down, show when scrolling up
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY) {
            setIsVisible(true);
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simulated new message notification (would be real in production)
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setHasNewMessage(Math.random() > 0.7); // Occasional notification
      }, 30000);
      return () => clearTimeout(timer);
    } else {
      setHasNewMessage(false);
    }
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setHasNewMessage(false);
  };

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 transition-all duration-300",
      !isVisible && "translate-y-20 opacity-0",
      className
    )}>
      {/* Chat Interface */}
      {isOpen && (
        <div className="mb-4 w-96 h-[600px] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <PamInterface 
            className="h-full" 
            onClose={() => setIsOpen(false)} 
          />
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={toggleOpen}
        className={cn(
          "relative w-16 h-16 rounded-full shadow-lg transition-all duration-300",
          "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
          "text-white flex items-center justify-center",
          "hover:scale-110 active:scale-95",
          "focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800",
          isOpen && "rotate-180"
        )}
        aria-label={isOpen ? "Close PAM" : "Open PAM"}
      >
        {/* Notification Indicator */}
        {hasNewMessage && !isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
        
        {/* Icon */}
        <div className="transition-transform duration-300">
          {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </div>
        
        {/* Subtle pulse animation when closed */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-25 animate-ping" />
        )}
      </button>
      
      {/* Tooltip */}
      {!isOpen && isVisible && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          Chat with PAM
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};