
import OfflineTripBanner from "./OfflineTripBanner";

interface TripPlannerHeaderProps {
  isOffline: boolean;
}

export default function TripPlannerHeader({ isOffline }: TripPlannerHeaderProps) {
  return (
    <>
      {isOffline && <OfflineTripBanner />}
    </>
  );
}
