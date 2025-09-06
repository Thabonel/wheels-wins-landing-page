import React, { useEffect } from 'react';
import { usePamMessageHandler } from '@/hooks/pam/usePamMessageHandler';
import { usePAMContext } from './PAMContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PAMTripIntegrationProps {
  onRouteUpdate?: (route: any) => void;
  onBudgetUpdate?: (budget: any) => void;
  onEmergency?: (data: any) => void;
}

export default function PAMTripIntegration({
  onRouteUpdate,
  onBudgetUpdate,
  onEmergency
}: PAMTripIntegrationProps) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { context, updateContext, addMessage } = usePAMContext();
  const { handleMessage } = usePamMessageHandler();

  // PAM WebSocket connection with enhanced trip planning actions
  const handlePAMMessage = async (message: any) => {
    console.log('🎯 PAM Trip Message:', message);
    
    // Handle standard message processing
    await handleMessage(message);
    
    // Enhanced trip-specific message handling
    switch (message.type) {
      case 'trip_optimization':
        if (message.route && onRouteUpdate) {
          onRouteUpdate(message.route);
          toast({
            title: "Route Optimized by PAM",
            description: `Saved ${message.savings?.time || 0} minutes and $${message.savings?.cost || 0}`,
          });
        }
        break;
        
      case 'budget_alert':
        if (message.budget && onBudgetUpdate) {
          onBudgetUpdate(message.budget);
          toast({
            title: "Budget Alert from PAM",
            description: message.alert_message,
            variant: message.severity === 'warning' ? 'destructive' : 'default',
          });
        }
        break;
        
      case 'emergency_response':
        if (onEmergency) {
          onEmergency(message.emergency_data);
          toast({
            title: "Emergency Assistance Activated",
            description: "PAM is coordinating help for you",
            variant: 'destructive',
          });
        }
        break;
        
      case 'friend_nearby':
        toast({
          title: "Friend Alert",
          description: `${message.friend_name} is ${message.distance} away!`,
        });
        break;
        
      case 'scenic_route_suggestion':
        addMessage({
          role: 'assistant',
          content: `🌟 I found a scenic route option: ${message.description}. It adds ${message.extra_time} minutes but includes ${message.highlights.join(', ')}. Would you like me to add it?`,
          context: { suggestion: 'scenic_route', action: 'scenic_route', tripData: message }
        });
        break;
    }
  };

  const handleConnectionStatus = (isConnected: boolean) => {
    console.log(`🔗 PAM Trip Connection: ${isConnected ? 'Connected' : 'Disconnected'}`);
    if (isConnected) {
      // Send current trip context to PAM when connected
      sendTripContextToPAM();
    }
  };

  // Placeholder WebSocket state (component uses PAM context instead)
  const isConnected = false;
  const sendMessage = async () => {};

  // Send current trip context to PAM for optimization
  const sendTripContextToPAM = async () => {
    if (isConnected && context.currentTrip.origin && context.currentTrip.destination) {
      try {
        await sendMessage(JSON.stringify({
          type: 'trip_context_update',
          data: {
            trip: context.currentTrip,
            profile: context.userProfile,
            friends: context.friends,
            timestamp: new Date().toISOString()
          }
        }));
        console.log('📊 Trip context sent to PAM');
      } catch (error) {
        console.error('❌ Failed to send trip context to PAM:', error);
      }
    }
  };

  // Voice command integration
  const handleVoiceCommand = async (command: string) => {
    if (isConnected) {
      await sendMessage(JSON.stringify({
        type: 'voice_command',
        command,
        context: context.currentTrip
      }));
    }
  };

  // Emergency assistance
  const triggerEmergencyAssistance = async () => {
    if (isConnected) {
      await sendMessage(JSON.stringify({
        type: 'emergency_request',
        location: {
          // Get current location
          timestamp: new Date().toISOString()
        },
        trip_context: context.currentTrip
      }));
    }
  };

  // Auto-send trip updates to PAM when context changes
  useEffect(() => {
    if (isConnected) {
      const debounceTimer = setTimeout(() => {
        sendTripContextToPAM();
      }, 1000);
      
      return () => clearTimeout(debounceTimer);
    }
  }, [context.currentTrip, isConnected]);

  // Expose PAM integration functions globally for easy access
  useEffect(() => {
    (window as any).pam = {
      sendMessage,
      handleVoiceCommand,
      triggerEmergency: triggerEmergencyAssistance,
      isConnected,
      context: context.currentTrip
    };
  }, [sendMessage, isConnected, context.currentTrip]);

  return (
    <>
      {/* Connection Status Indicator */}
      {isConnected && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          🤖 PAM Connected
        </div>
      )}
      
      {/* Emergency Button - Always visible */}
      <button
        onClick={triggerEmergencyAssistance}
        className="fixed top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium"
        disabled={!isConnected}
      >
        🚨 Emergency
      </button>
    </>
  );
}

// Export utility functions for other components to use
export const PAMTripUtils = {
  // Quick actions other components can call
  optimizeRoute: () => {
    if ((window as any).pam?.isConnected) {
      (window as any).pam.sendMessage(JSON.stringify({
        type: 'optimize_route_request'
      }));
    }
  },
  
  findGasStations: () => {
    if ((window as any).pam?.isConnected) {
      (window as any).pam.sendMessage(JSON.stringify({
        type: 'find_gas_stations'
      }));
    }
  },
  
  checkWeather: () => {
    if ((window as any).pam?.isConnected) {
      (window as any).pam.sendMessage(JSON.stringify({
        type: 'weather_check'
      }));
    }
  },
  
  findFriends: () => {
    if ((window as any).pam?.isConnected) {
      (window as any).pam.sendMessage(JSON.stringify({
        type: 'find_nearby_friends'
      }));
    }
  }
};
