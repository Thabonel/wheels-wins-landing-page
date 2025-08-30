/**
 * Medical Disclaimer Component
 * Comprehensive medical warnings and disclaimers with location-based emergency numbers
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Phone,
  Info,
  Shield,
  MapPin,
  Globe,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Emergency numbers by country/region
const EMERGENCY_NUMBERS: { [key: string]: { number: string; name: string } } = {
  US: { number: '911', name: 'United States' },
  CA: { number: '911', name: 'Canada' },
  MX: { number: '911', name: 'Mexico' },
  GB: { number: '999', name: 'United Kingdom' },
  EU: { number: '112', name: 'European Union' },
  AU: { number: '000', name: 'Australia' },
  NZ: { number: '111', name: 'New Zealand' },
  JP: { number: '119', name: 'Japan' },
  CN: { number: '120', name: 'China' },
  IN: { number: '108', name: 'India' },
  BR: { number: '192', name: 'Brazil' },
  ZA: { number: '10111', name: 'South Africa' },
  DEFAULT: { number: '112', name: 'International' }
};

interface MedicalDisclaimerProps {
  type: 'initial' | 'ai-chat' | 'medication' | 'emergency' | 'offline';
  onAccept?: () => void;
  onDecline?: () => void;
  showAlways?: boolean;
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({
  type,
  onAccept,
  onDecline,
  showAlways = false
}) => {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [showDialog, setShowDialog] = useState(true);
  const [userCountry, setUserCountry] = useState<string>('US');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [emergencyNumber, setEmergencyNumber] = useState(EMERGENCY_NUMBERS.US);

  // Detect user's location
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // Try to get location from browser
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              // Use reverse geocoding API (would need actual implementation)
              // For now, use timezone as a rough indicator
              const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              
              if (timezone.includes('America')) {
                if (timezone.includes('Mexico')) {
                  setUserCountry('MX');
                } else if (timezone.includes('Canada')) {
                  setUserCountry('CA');
                } else {
                  setUserCountry('US');
                }
              } else if (timezone.includes('Europe')) {
                setUserCountry('EU');
              } else if (timezone.includes('Australia')) {
                setUserCountry('AU');
              } else if (timezone.includes('Asia')) {
                if (timezone.includes('Tokyo')) {
                  setUserCountry('JP');
                } else if (timezone.includes('Shanghai') || timezone.includes('Beijing')) {
                  setUserCountry('CN');
                } else if (timezone.includes('Kolkata')) {
                  setUserCountry('IN');
                }
              } else if (timezone.includes('Africa')) {
                setUserCountry('ZA');
              }
            },
            (error) => {
              console.log('Geolocation error:', error);
              // Fallback to IP-based detection would go here
            }
          );
        }

        // Also try to get from user's profile if available
        const userProfile = localStorage.getItem('user_country');
        if (userProfile) {
          setUserCountry(userProfile);
        }
      } catch (error) {
        console.error('Location detection error:', error);
      }
    };

    detectLocation();
  }, []);

  // Update emergency number based on country
  useEffect(() => {
    setEmergencyNumber(EMERGENCY_NUMBERS[userCountry] || EMERGENCY_NUMBERS.DEFAULT);
  }, [userCountry]);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if disclaimer has been accepted before (stored in localStorage)
  useEffect(() => {
    if (!showAlways) {
      const disclaimerKey = `medical_disclaimer_${type}_accepted`;
      const acceptedBefore = localStorage.getItem(disclaimerKey);
      const acceptedDate = acceptedBefore ? new Date(acceptedBefore) : null;
      
      // Re-show disclaimer every 30 days for safety
      if (acceptedDate) {
        const daysSinceAccepted = Math.floor((Date.now() - acceptedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceAccepted < 30) {
          setShowDialog(false);
          if (onAccept) onAccept();
        }
      }
    }
  }, [type, showAlways, onAccept]);

  const handleAccept = () => {
    if (!accepted && type !== 'emergency') {
      toast.error('Please check the box to confirm you understand');
      return;
    }

    // Store acceptance
    const disclaimerKey = `medical_disclaimer_${type}_accepted`;
    localStorage.setItem(disclaimerKey, new Date().toISOString());

    setShowDialog(false);
    if (onAccept) onAccept();
  };

  const handleDecline = () => {
    setShowDialog(false);
    if (onDecline) onDecline();
  };

  // Different disclaimer content based on type
  const getDisclaimerContent = () => {
    switch (type) {
      case 'initial':
        return {
          title: '🏥 Welcome to Your Medical Records',
          content: (
            <div className="space-y-4">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important Medical Disclaimer</AlertTitle>
                <AlertDescription>
                  This medical records feature is for informational and organizational purposes ONLY.
                  It is NOT a substitute for professional medical advice, diagnosis, or treatment.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="font-semibold">This feature helps you:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Organize medical documents while traveling</li>
                  <li>Track medications and appointments</li>
                  <li>Store emergency information</li>
                  <li>Share records with healthcare providers</li>
                </ul>
              </div>

              <Alert className="border-red-200 bg-red-50">
                <Phone className="h-4 w-4" />
                <AlertTitle>Emergency Services</AlertTitle>
                <AlertDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="h-4 w-4" />
                    <span>Your location: {emergencyNumber.name}</span>
                  </div>
                  <div className="text-lg font-bold mt-2">
                    Emergency: {emergencyNumber.number}
                  </div>
                  <p className="text-xs mt-1">Call immediately for medical emergencies</p>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="font-semibold text-destructive">⚠️ WARNING:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>This is NOT a medical device or diagnostic tool</li>
                  <li>AI responses are for information only</li>
                  <li>Always consult healthcare professionals</li>
                  <li>Never delay emergency care to use this app</li>
                </ul>
              </div>
            </div>
          ),
          requiresCheckbox: true
        };

      case 'ai-chat':
        return {
          title: '🤖 AI Health Information Assistant',
          content: (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Critical AI Disclaimer</AlertTitle>
                <AlertDescription>
                  This AI provides general health information ONLY. It is NOT a substitute for professional medical advice, diagnosis, or treatment.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="font-semibold">Important limitations:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>AI responses may contain errors or be incomplete</li>
                  <li>Cannot diagnose medical conditions</li>
                  <li>Cannot prescribe medications or treatments</li>
                  <li>Not aware of your complete medical history</li>
                  <li>Cannot replace a doctor's examination</li>
                </ul>
              </div>

              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-semibold">For emergencies in {emergencyNumber.name}:</span>
                  <span className="text-xl font-bold ml-2">{emergencyNumber.number}</span>
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">
                  ✅ Use this AI to:
                  <ul className="list-disc pl-5 mt-2">
                    <li>Understand medical terms</li>
                    <li>Prepare questions for doctors</li>
                    <li>Learn about general health topics</li>
                    <li>Get travel health tips</li>
                  </ul>
                </p>
              </div>
            </div>
          ),
          requiresCheckbox: true
        };

      case 'medication':
        return {
          title: '💊 Medication Tracker Safety',
          content: (
            <div className="space-y-4">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Medication Safety Notice</AlertTitle>
                <AlertDescription>
                  This tracker is for reference only. Always follow your doctor's instructions exactly.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="font-semibold">Important reminders:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Never change medications without medical supervision</li>
                  <li>Check with pharmacists for drug interactions</li>
                  <li>Follow prescribed dosages exactly</li>
                  <li>Report side effects to your healthcare provider</li>
                  <li>Keep medications properly stored in your RV</li>
                </ul>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This tracker helps organize your medications but does not provide medical advice about their use.
                </AlertDescription>
              </Alert>
            </div>
          ),
          requiresCheckbox: true
        };

      case 'emergency':
        return {
          title: '🚨 Emergency Information',
          content: (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <Phone className="h-4 w-4" />
                <AlertTitle>Emergency Services</AlertTitle>
                <AlertDescription>
                  <div className="text-2xl font-bold text-destructive mt-2">
                    Call {emergencyNumber.number}
                  </div>
                  <p className="text-sm mt-1">Emergency number for {emergencyNumber.name}</p>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="font-semibold">If you're having a medical emergency:</p>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>Call {emergencyNumber.number} immediately</li>
                  <li>Do not rely on this app for emergency decisions</li>
                  <li>Provide your location to emergency services</li>
                  <li>Follow dispatcher instructions</li>
                  <li>Have someone stay with you if possible</li>
                </ol>
              </div>

              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Would implement country selector
                      toast.info('Location selector coming soon');
                    }}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Change Location
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ),
          requiresCheckbox: false
        };

      case 'offline':
        return {
          title: '📱 Offline Medical Access',
          content: (
            <div className="space-y-4">
              <Alert className="border-yellow-200 bg-yellow-50">
                <WifiOff className="h-4 w-4" />
                <AlertTitle>Offline Mode Active</AlertTitle>
                <AlertDescription>
                  You're currently offline. Some features are limited or unavailable.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="font-semibold">Offline limitations:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>No AI health consultations available</li>
                  <li>Cannot sync with cloud storage</li>
                  <li>Information may not be current</li>
                  <li>Cannot update emergency contacts</li>
                </ul>
              </div>

              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  Emergency services ({emergencyNumber.number}) work without internet. Call immediately if needed.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">
                  ✅ Available offline:
                  <ul className="list-disc pl-5 mt-2">
                    <li>View saved medical records</li>
                    <li>Access emergency information</li>
                    <li>Check medication schedules</li>
                    <li>View cached documents</li>
                  </ul>
                </p>
              </div>
            </div>
          ),
          requiresCheckbox: false
        };

      default:
        return {
          title: 'Medical Disclaimer',
          content: <div>Unknown disclaimer type</div>,
          requiresCheckbox: false
        };
    }
  };

  const disclaimer = getDisclaimerContent();

  if (!showDialog && !showAlways) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{disclaimer.title}</DialogTitle>
        </DialogHeader>
        
        <DialogDescription asChild>
          <div>{disclaimer.content}</div>
        </DialogDescription>

        {disclaimer.requiresCheckbox && (
          <div className="flex items-start space-x-2 mt-4">
            <Checkbox 
              id="accept-disclaimer" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
            />
            <label 
              htmlFor="accept-disclaimer" 
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand this is for informational purposes only and will seek professional medical care for health concerns
            </label>
          </div>
        )}

        <DialogFooter className="gap-2">
          {type !== 'emergency' && (
            <Button 
              variant="outline" 
              onClick={handleDecline}
            >
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleAccept}
            disabled={disclaimer.requiresCheckbox && !accepted}
          >
            {type === 'emergency' ? 'Close' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Persistent disclaimer banner component
export const MedicalDisclaimerBanner: React.FC = () => {
  const [emergencyNumber, setEmergencyNumber] = useState(EMERGENCY_NUMBERS.US);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);

  // Get user's location on mount
  useEffect(() => {
    const userCountry = localStorage.getItem('user_country') || 'US';
    setEmergencyNumber(EMERGENCY_NUMBERS[userCountry] || EMERGENCY_NUMBERS.DEFAULT);
  }, []);

  return (
    <>
      <Alert className="border-yellow-200 bg-yellow-50/50 mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-sm">Medical Records Disclaimer</AlertTitle>
        <AlertDescription className="text-xs">
          This feature is for informational and organizational purposes only. Not a substitute for professional medical advice.
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 ml-2 text-xs"
            onClick={() => setShowEmergencyDialog(true)}
          >
            Emergency: {emergencyNumber.number}
          </Button>
        </AlertDescription>
      </Alert>

      {showEmergencyDialog && (
        <MedicalDisclaimer 
          type="emergency" 
          onAccept={() => setShowEmergencyDialog(false)}
        />
      )}
    </>
  );
};