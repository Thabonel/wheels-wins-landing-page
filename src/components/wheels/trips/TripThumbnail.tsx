/**
 * Trip thumbnail component displaying static map preview
 * PRD Requirement: Visual trip identification through thumbnails
 */

import { useState } from 'react';
import { UserTrip } from '@/types/userTrips';
import { getTripThumbnailUrl, getPlaceholderThumbnailUrl, tripHasValidRouteData } from '@/utils/tripThumbnails';
import { MapPin, Route } from 'lucide-react';

interface TripThumbnailProps {
  trip: UserTrip;
  className?: string;
  width?: number;
  height?: number;
  onClick?: () => void;
}

export function TripThumbnail({
  trip,
  className = '',
  width = 300,
  height = 150,
  onClick
}: TripThumbnailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasValidRoute = tripHasValidRouteData(trip);
  const thumbnailUrl = hasValidRoute
    ? getTripThumbnailUrl(trip, { width, height })
    : getPlaceholderThumbnailUrl({ width, height });

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  // Fallback content when no thumbnail is available
  if (!thumbnailUrl || imageError) {
    return (
      <div
        className={`bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:from-blue-100 hover:to-indigo-200 ${className}`}
        style={{ width, height }}
        onClick={onClick}
      >
        <div className="text-center">
          {hasValidRoute ? (
            <Route className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          ) : (
            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          )}
          <p className="text-xs text-gray-600 px-2">
            {hasValidRoute ? 'Map preview' : 'No route data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md group ${className}`}
      style={{ width, height }}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {!imageLoaded && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-center">
            <Route className="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        </div>
      )}

      {/* Thumbnail image */}
      <img
        src={thumbnailUrl}
        alt={`${trip.title} route map`}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {/* Overlay with trip stats */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center justify-between text-white text-xs">
            {trip.metadata?.distance_miles && (
              <span className="bg-black/50 px-2 py-1 rounded">
                {Math.round(trip.metadata.distance_miles)} mi
              </span>
            )}
            {trip.metadata?.duration_hours && (
              <span className="bg-black/50 px-2 py-1 rounded">
                {Math.round(trip.metadata.duration_hours)} hrs
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Route indicator */}
      <div className="absolute top-2 right-2">
        {hasValidRoute ? (
          <div className="bg-green-500 w-3 h-3 rounded-full border-2 border-white shadow-sm" />
        ) : (
          <div className="bg-gray-400 w-3 h-3 rounded-full border-2 border-white shadow-sm" />
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for smaller cards or list views
 */
export function TripThumbnailCompact({
  trip,
  className = '',
  onClick
}: Omit<TripThumbnailProps, 'width' | 'height'>) {
  return (
    <TripThumbnail
      trip={trip}
      className={className}
      width={120}
      height={80}
      onClick={onClick}
    />
  );
}