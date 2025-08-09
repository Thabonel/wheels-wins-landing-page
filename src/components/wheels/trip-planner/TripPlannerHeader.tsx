import OfflineTripBanner from './OfflineTripBanner';
import MapUnavailableBanner from './MapUnavailableBanner';

interface TripPlannerHeaderProps {
  isOffline: boolean;
  tokenMissing?: boolean;
}

export default function TripPlannerHeader({
  isOffline,
  tokenMissing = false,
}: TripPlannerHeaderProps) {
  return (
    <>
      {isOffline && <OfflineTripBanner />}
      {!isOffline && tokenMissing && <MapUnavailableBanner />}
    </>
  );
}
