import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import { Waypoint } from '../types';

interface UseTripSyncProps {
  tripId: string | null;
  map: React.MutableRefObject<mapboxgl.Map | undefined>;
  directionsControl: React.MutableRefObject<MapboxDirections | undefined>;
  setOriginName: (name: string) => void;
  setDestName: (name: string) => void;
  setWaypoints: (wps: Waypoint[]) => void;
}

export function useTripSync({
  tripId,
  map,
  directionsControl,
  setOriginName,
  setDestName,
  setWaypoints
}: UseTripSyncProps) {
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`group_trips:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_trips', filter: `id=eq.${tripId}` },
        payload => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updated = payload.new as any;
            if (!updated || !updated.route_data) return;
            const route = JSON.parse(updated.route_data);
            if (route.origin?.name) setOriginName(route.origin.name);
            if (route.dest?.name) setDestName(route.dest.name);
            const wps: Waypoint[] = route.waypoints || [];
            setWaypoints(wps);
            if (directionsControl.current) {
              directionsControl.current.setOrigin(route.origin.coords);
              directionsControl.current.setDestination(route.dest.coords);
              directionsControl.current.removeWaypoints();
              wps.forEach((wp, idx) => {
                directionsControl.current!.addWaypoint(idx + 1, wp.coords);
              });
            }
          } catch (err) {
            console.error('Error applying trip update', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [tripId, map, directionsControl, setOriginName, setDestName, setWaypoints]);
}

export default useTripSync;
