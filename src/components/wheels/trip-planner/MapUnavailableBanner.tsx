import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPinOff } from 'lucide-react';

export default function MapUnavailableBanner() {
  return (
    <Alert className="bg-red-50 border-red-200 text-red-800 mb-4">
      <MapPinOff className="h-4 w-4" />
      <AlertDescription>Map features are disabled: missing Mapbox access token.</AlertDescription>
    </Alert>
  );
}
