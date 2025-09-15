/**
 * Navigation Export Button
 * Trigger button for the comprehensive navigation export system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, Send } from 'lucide-react';
import NavigationExportModal from './NavigationExportModal';

interface NavigationExportButtonProps {
  tripData: {
    waypoints: any[];
    route?: any;
    profile?: string;
    distance?: number;
    duration?: number;
    tripName?: string;
  };
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

export default function NavigationExportButton({
  tripData,
  variant = 'default',
  size = 'default',
  className = '',
  disabled = false
}: NavigationExportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasValidTrip = tripData.waypoints && tripData.waypoints.length >= 2;

  const handleClick = () => {
    if (!hasValidTrip) {
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={disabled || !hasValidTrip}
        title={hasValidTrip ? 'Send to Navigation' : 'Add at least 2 waypoints to export'}
      >
        {size === 'icon' ? (
          <Send className="w-4 h-4" />
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Send To
          </>
        )}
      </Button>

      <NavigationExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tripData={tripData}
      />
    </>
  );
}