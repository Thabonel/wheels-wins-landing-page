/**
 * Tests for route data transformation utilities
 */

import {
  isValidGeoJSONLineString,
  transformToGeoJSONLineString,
  createFallbackGeometry,
  extractWaypoints
} from '../routeDataTransformers';

describe('Route Data Transformers', () => {
  const validLineString = {
    type: 'LineString' as const,
    coordinates: [
      [-122.4194, 37.7749], // San Francisco
      [-122.0839, 37.4220], // Palo Alto
      [-121.8863, 37.3382]  // San Jose
    ]
  };

  const sampleWaypoints = [
    { lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
    { lat: 37.4220, lng: -122.0839, name: 'Palo Alto' },
    { lat: 37.3382, lng: -121.8863, name: 'San Jose' }
  ];

  describe('isValidGeoJSONLineString', () => {
    it('should validate correct GeoJSON LineString', () => {
      expect(isValidGeoJSONLineString(validLineString)).toBe(true);
    });

    it('should reject invalid geometry types', () => {
      expect(isValidGeoJSONLineString({ type: 'Point', coordinates: [0, 0] })).toBe(false);
      expect(isValidGeoJSONLineString({ type: 'Polygon', coordinates: [] })).toBe(false);
    });

    it('should reject invalid coordinate arrays', () => {
      expect(isValidGeoJSONLineString({
        type: 'LineString',
        coordinates: [[0]] // Missing second coordinate
      })).toBe(false);

      expect(isValidGeoJSONLineString({
        type: 'LineString',
        coordinates: [] // Empty coordinates
      })).toBe(false);
    });

    it('should reject non-numeric coordinates', () => {
      expect(isValidGeoJSONLineString({
        type: 'LineString',
        coordinates: [['invalid', 'coords']]
      })).toBe(false);
    });
  });

  describe('transformToGeoJSONLineString', () => {
    it('should return valid LineString as-is', () => {
      const result = transformToGeoJSONLineString(validLineString);
      expect(result).toEqual(validLineString);
    });

    it('should extract geometry from route object', () => {
      const routeWithGeometry = {
        distance: 1000,
        duration: 600,
        geometry: validLineString
      };

      const result = transformToGeoJSONLineString(routeWithGeometry);
      expect(result).toEqual(validLineString);
    });

    it('should handle coordinate arrays directly', () => {
      const coordinates = [[-122.4194, 37.7749], [-122.0839, 37.4220]];
      const result = transformToGeoJSONLineString(coordinates);

      expect(result).toEqual({
        type: 'LineString',
        coordinates
      });
    });

    it('should handle array of routes (take first)', () => {
      const routes = [
        { geometry: validLineString },
        { geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }
      ];

      const result = transformToGeoJSONLineString(routes);
      expect(result).toEqual(validLineString);
    });

    it('should handle nested routes structure', () => {
      const apiResponse = {
        routes: [{ geometry: validLineString }]
      };

      const result = transformToGeoJSONLineString(apiResponse);
      expect(result).toEqual(validLineString);
    });

    it('should return null for invalid data', () => {
      expect(transformToGeoJSONLineString(null)).toBe(null);
      expect(transformToGeoJSONLineString(undefined)).toBe(null);
      expect(transformToGeoJSONLineString('invalid')).toBe(null);
      expect(transformToGeoJSONLineString({})).toBe(null);
    });
  });

  describe('createFallbackGeometry', () => {
    it('should create LineString from waypoints', () => {
      const result = createFallbackGeometry(sampleWaypoints);

      expect(result).toEqual({
        type: 'LineString',
        coordinates: [
          [-122.4194, 37.7749],
          [-122.0839, 37.4220],
          [-121.8863, 37.3382]
        ]
      });
    });

    it('should return null for insufficient waypoints', () => {
      expect(createFallbackGeometry([])).toBe(null);
      expect(createFallbackGeometry([sampleWaypoints[0]])).toBe(null);
    });

    it('should filter out invalid waypoints', () => {
      const mixedWaypoints = [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 'invalid', lng: -122.0839 }, // Invalid
        { lat: 37.3382, lng: -121.8863 }
      ];

      const result = createFallbackGeometry(mixedWaypoints);
      expect(result?.coordinates).toHaveLength(2);
    });
  });

  describe('extractWaypoints', () => {
    it('should extract waypoints from trip data', () => {
      const tripData = {
        waypoints: sampleWaypoints
      };

      const result = extractWaypoints(tripData);
      expect(result).toEqual(sampleWaypoints);
    });

    it('should extract from metadata', () => {
      const tripData = {
        metadata: {
          waypoints: sampleWaypoints
        }
      };

      const result = extractWaypoints(tripData);
      expect(result).toEqual(sampleWaypoints);
    });

    it('should extract from start/end locations', () => {
      const tripData = {
        start_location: { lat: 37.7749, lng: -122.4194 },
        end_location: { lat: 37.3382, lng: -121.8863 }
      };

      const result = extractWaypoints(tripData);
      expect(result).toEqual([
        { lat: 37.7749, lng: -122.4194, name: 'Start' },
        { lat: 37.3382, lng: -121.8863, name: 'End' }
      ]);
    });

    it('should handle invalid data gracefully', () => {
      expect(extractWaypoints(null)).toEqual([]);
      expect(extractWaypoints({})).toEqual([]);
      expect(extractWaypoints({ invalid: 'data' })).toEqual([]);
    });
  });
});