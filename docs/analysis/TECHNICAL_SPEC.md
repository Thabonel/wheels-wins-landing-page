# Technical Specification: Enhanced Planning System

**Version:** 1.0
**Date:** January 2025
**Status:** Approved for Implementation
**Related Documents:** INTEGRATION_PLAN.md, CODEBASE_ANALYSIS.md

---

## Executive Summary

This document specifies the technical architecture and implementation details for enhancing the Wheels & Wins platform with comprehensive trip planning capabilities. The design follows an additive enhancement approach, ensuring zero breaking changes to existing functionality while introducing advanced features for professional-grade trip planning.

**Key Objectives:**
- Add GPX import/export with full route preservation
- Implement collaborative trip planning (multi-user editing)
- Version control for routes with rollback capability
- Offline map support with tile caching
- Vehicle readiness checklists with maintenance integration
- Equipment inventory tracking with maintenance schedules
- Community features (route sharing, reviews, ratings)

**Architecture Principle:** Feature-flagged, backward-compatible extensions to existing systems.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Module Specifications](#2-module-specifications)
3. [Data Models](#3-data-models)
4. [API Specifications](#4-api-specifications)
5. [Frontend Components](#5-frontend-components)
6. [Backend Services](#6-backend-services)
7. [Database Schema](#7-database-schema)
8. [Security & Permissions](#8-security--permissions)
9. [Performance Requirements](#9-performance-requirements)
10. [Testing Strategy](#10-testing-strategy)
11. [Deployment Plan](#11-deployment-plan)
12. [Monitoring & Observability](#12-monitoring--observability)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Client Layer (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Trip Planner │  │  Equipment   │  │ Offline Map Manager  │  │
│  │   Enhanced   │  │  Inventory   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API / WebSocket
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    API Gateway (FastAPI)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Trip API   │  │ Equipment API│  │   Offline Sync API   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼────────┐ ┌───▼────────┐ ┌───▼──────────────┐
│   PostgreSQL    │ │   Redis    │ │  S3 (Map Tiles)  │
│   (Supabase)    │ │  (Cache)   │ │                  │
└─────────────────┘ └────────────┘ └──────────────────┘
```

### 1.2 Technology Stack Additions

**Frontend:**
- `@tmcw/togeojson` ^5.8.1 - GPX/KML parsing
- `geojson` ^0.5.0 - GeoJSON utilities
- `@turf/turf` ^6.5.0 - Geospatial calculations
- `localforage` ^1.10.0 - Offline storage (IndexedDB/WebSQL)
- `dexie` ^3.2.4 - IndexedDB wrapper for offline maps
- `comlink` ^4.4.1 - Web Worker communication

**Backend:**
- `gpxpy` ^1.5.0 - Python GPX parsing/generation
- `geojson` ^3.0.1 - Python GeoJSON utilities
- `shapely` ^2.0.2 - Geometric operations
- `rasterio` ^1.3.9 - Raster data (map tiles)
- `celery-beat` ^2.5.0 - Enhanced task scheduling

### 1.3 Design Patterns

**Frontend Patterns:**
- **State Management:** Zustand stores with persistence middleware
- **Data Fetching:** React Query with optimistic updates
- **Offline-First:** Service Worker + IndexedDB caching strategy
- **Component Pattern:** Compound components with Radix UI primitives
- **Error Boundaries:** Granular error handling per module

**Backend Patterns:**
- **Repository Pattern:** Data access abstraction layer
- **Service Layer:** Business logic separation
- **Event-Driven:** Celery tasks for async operations
- **CQRS:** Command/Query separation for complex operations
- **Saga Pattern:** Distributed transaction handling

---

## 2. Module Specifications

### 2.1 GPX Import/Export Module

**Module Name:** `GPXProcessor`
**Location:** `backend/app/services/trip/gpx_processor.py`

#### 2.1.1 Capabilities

```python
from typing import List, Dict, Any, Optional
from datetime import datetime
import gpxpy
import gpxpy.gpx

class GPXProcessor:
    """
    GPX file processing service for trip import/export

    Features:
    - Parse GPX files with waypoints, routes, and tracks
    - Preserve elevation data, timestamps, and metadata
    - Convert to internal trip format (user_trips table)
    - Export trips to GPX with full fidelity
    - Validate GPX structure and repair common issues
    """

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.max_waypoints = 10000

    async def import_gpx(
        self,
        file_content: bytes,
        filename: str,
        trip_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Import GPX file and create trip in database

        Args:
            file_content: Raw GPX file bytes
            filename: Original filename
            trip_name: Optional custom trip name

        Returns:
            {
                "trip_id": "uuid",
                "waypoints_count": 150,
                "total_distance_km": 1420.5,
                "elevation_gain_m": 3500,
                "elevation_loss_m": 3200,
                "duration_hours": 18.5,
                "warnings": ["Timestamps missing for some waypoints"]
            }

        Raises:
            ValueError: Invalid GPX format
            FileSizeError: File exceeds max size
        """
        # Validate file size
        if len(file_content) > self.max_file_size:
            raise FileSizeError(f"File size exceeds {self.max_file_size} bytes")

        # Parse GPX
        gpx = gpxpy.parse(file_content.decode('utf-8'))

        # Extract metadata
        metadata = {
            "name": trip_name or gpx.name or filename,
            "description": gpx.description,
            "author": gpx.author_name,
            "created_at": gpx.time or datetime.utcnow()
        }

        # Process waypoints
        waypoints = []
        for waypoint in gpx.waypoints:
            waypoints.append({
                "latitude": waypoint.latitude,
                "longitude": waypoint.longitude,
                "elevation": waypoint.elevation,
                "time": waypoint.time,
                "name": waypoint.name,
                "description": waypoint.description
            })

        # Process routes (preferred over tracks for trip planning)
        routes = []
        for route in gpx.routes:
            route_points = []
            for point in route.points:
                route_points.append({
                    "latitude": point.latitude,
                    "longitude": point.longitude,
                    "elevation": point.elevation
                })
            routes.append({
                "name": route.name,
                "points": route_points
            })

        # Process tracks (if no routes, use tracks)
        tracks = []
        if not routes:
            for track in gpx.tracks:
                for segment in track.segments:
                    track_points = []
                    for point in segment.points:
                        track_points.append({
                            "latitude": point.latitude,
                            "longitude": point.longitude,
                            "elevation": point.elevation,
                            "time": point.time
                        })
                    tracks.append({
                        "name": track.name,
                        "points": track_points
                    })

        # Calculate statistics
        total_distance = gpx.length_3d() / 1000  # Convert to km
        uphill, downhill = gpx.get_uphill_downhill()
        duration = gpx.get_duration()

        # Store in database
        trip_data = {
            "user_id": self.user_id,
            "title": metadata["name"],
            "description": metadata["description"],
            "gpx_data": {
                "metadata": metadata,
                "waypoints": waypoints,
                "routes": routes,
                "tracks": tracks
            },
            "total_distance_km": total_distance,
            "elevation_gain_m": uphill,
            "elevation_loss_m": downhill,
            "estimated_duration_hours": duration / 3600 if duration else None,
            "source": "gpx_import",
            "imported_at": datetime.utcnow()
        }

        # Insert into trip_templates_extended table
        response = await supabase.table("trip_templates_extended").insert(trip_data).execute()

        return {
            "trip_id": response.data[0]["id"],
            "waypoints_count": len(waypoints),
            "total_distance_km": total_distance,
            "elevation_gain_m": uphill,
            "elevation_loss_m": downhill,
            "duration_hours": duration / 3600 if duration else None,
            "warnings": self._generate_warnings(gpx)
        }

    async def export_gpx(
        self,
        trip_id: str,
        include_waypoints: bool = True,
        include_elevation: bool = True
    ) -> bytes:
        """
        Export trip to GPX format

        Args:
            trip_id: UUID of trip to export
            include_waypoints: Include waypoints in output
            include_elevation: Include elevation data

        Returns:
            GPX file content as bytes
        """
        # Fetch trip from database
        trip = await supabase.table("trip_templates_extended").select("*").eq("id", trip_id).single().execute()

        # Create GPX object
        gpx = gpxpy.gpx.GPX()

        # Set metadata
        gpx.name = trip.data["title"]
        gpx.description = trip.data.get("description")
        gpx.author_name = "Wheels & Wins"
        gpx.time = datetime.utcnow()

        # Add waypoints
        if include_waypoints and trip.data["gpx_data"].get("waypoints"):
            for wp in trip.data["gpx_data"]["waypoints"]:
                waypoint = gpxpy.gpx.GPXWaypoint(
                    latitude=wp["latitude"],
                    longitude=wp["longitude"],
                    elevation=wp.get("elevation") if include_elevation else None,
                    time=wp.get("time"),
                    name=wp.get("name"),
                    description=wp.get("description")
                )
                gpx.waypoints.append(waypoint)

        # Add routes
        if trip.data["gpx_data"].get("routes"):
            for route_data in trip.data["gpx_data"]["routes"]:
                route = gpxpy.gpx.GPXRoute()
                route.name = route_data.get("name")

                for point in route_data["points"]:
                    route_point = gpxpy.gpx.GPXRoutePoint(
                        latitude=point["latitude"],
                        longitude=point["longitude"],
                        elevation=point.get("elevation") if include_elevation else None
                    )
                    route.points.append(route_point)

                gpx.routes.append(route)

        # Convert to XML string and encode
        return gpx.to_xml().encode('utf-8')

    def _generate_warnings(self, gpx: gpxpy.gpx.GPX) -> List[str]:
        """Generate validation warnings"""
        warnings = []

        if not gpx.waypoints and not gpx.routes and not gpx.tracks:
            warnings.append("No waypoints, routes, or tracks found in GPX file")

        # Check for missing timestamps
        has_timestamps = any(wp.time for wp in gpx.waypoints)
        if not has_timestamps and gpx.waypoints:
            warnings.append("Timestamps missing for waypoints")

        # Check for missing elevation data
        has_elevation = any(wp.elevation is not None for wp in gpx.waypoints)
        if not has_elevation and gpx.waypoints:
            warnings.append("Elevation data missing for waypoints")

        return warnings
```

#### 2.1.2 Frontend Component

**Location:** `src/components/wheels/trip-planner/GPXImporter.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GPXImportResult {
  trip_id: string;
  waypoints_count: number;
  total_distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  duration_hours: number | null;
  warnings: string[];
}

export const GPXImporter: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);

      const response = await fetch('/api/v1/trips/import-gpx', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Import failed');
      }

      return response.json() as Promise<GPXImportResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });

      toast.success(`Trip imported successfully!`, {
        description: `${data.waypoints_count} waypoints, ${data.total_distance_km.toFixed(1)} km`,
      });

      if (data.warnings.length > 0) {
        data.warnings.forEach(warning => {
          toast.warning(warning);
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Import failed', {
        description: error.message
      });
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      toast.error('Invalid file type', {
        description: 'Please upload a .gpx file'
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB'
      });
      return;
    }

    setImporting(true);
    await importMutation.mutateAsync(file);
    setImporting(false);
  }, [importMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/gpx+xml': ['.gpx']
    },
    maxFiles: 1,
    disabled: importing
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
          ${importing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          {importing ? (
            <>
              <div className="animate-spin">
                <Upload className="w-12 h-12 text-primary" />
              </div>
              <p className="text-lg font-medium">Importing GPX file...</p>
              <p className="text-sm text-gray-500">Processing waypoints and route data</p>
            </>
          ) : (
            <>
              <FileText className="w-12 h-12 text-gray-400" />
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop GPX file here' : 'Drag & drop GPX file'}
              </p>
              <p className="text-sm text-gray-500">
                or click to browse (max 10MB)
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
          <span>Preserves waypoints, routes, and elevation data</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
          <span>Compatible with GPS devices and mapping software</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <span>Large files may take several seconds to process</span>
        </div>
      </div>
    </div>
  );
};
```

### 2.2 Route Versioning Module

**Module Name:** `RouteVersionControl`
**Location:** `backend/app/services/trip/route_versioning.py`

#### 2.2.1 Capabilities

```python
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
from uuid import uuid4

class RouteVersionControl:
    """
    Version control system for trip routes

    Features:
    - Save route snapshots on every significant change
    - Compare versions (diff visualization)
    - Rollback to previous versions
    - Branch routes for alternative planning
    - Merge route versions
    """

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.max_versions_per_route = 50  # Auto-cleanup old versions

    async def save_version(
        self,
        trip_id: str,
        route_data: Dict[str, Any],
        change_description: str,
        parent_version_id: Optional[str] = None
    ) -> str:
        """
        Save a new route version

        Args:
            trip_id: UUID of the trip
            route_data: Complete route data (waypoints, settings, etc.)
            change_description: Human-readable description of changes
            parent_version_id: Optional parent version for branching

        Returns:
            version_id: UUID of created version
        """
        # Generate version metadata
        version_id = str(uuid4())
        version_number = await self._get_next_version_number(trip_id)

        # Calculate diff from parent if exists
        diff = None
        if parent_version_id:
            parent = await self._get_version(parent_version_id)
            diff = self._calculate_diff(parent["route_data"], route_data)

        # Store version
        version_data = {
            "id": version_id,
            "trip_id": trip_id,
            "version_number": version_number,
            "parent_version_id": parent_version_id,
            "route_data": route_data,
            "diff": diff,
            "change_description": change_description,
            "created_by": self.user_id,
            "created_at": datetime.utcnow().isoformat()
        }

        await supabase.table("route_versions").insert(version_data).execute()

        # Cleanup old versions if exceeding limit
        await self._cleanup_old_versions(trip_id)

        return version_id

    async def get_version_history(
        self,
        trip_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get version history for a trip

        Returns list of versions with metadata (no full route_data)
        """
        response = await supabase.table("route_versions") \
            .select("id, version_number, change_description, created_by, created_at") \
            .eq("trip_id", trip_id) \
            .order("version_number", desc=True) \
            .limit(limit) \
            .execute()

        return response.data

    async def restore_version(
        self,
        trip_id: str,
        version_id: str
    ) -> Dict[str, Any]:
        """
        Restore a trip to a previous version

        Creates a new version based on the restored data
        """
        # Fetch version to restore
        version = await self._get_version(version_id)

        # Create new version based on restored data
        new_version_id = await self.save_version(
            trip_id=trip_id,
            route_data=version["route_data"],
            change_description=f"Restored from version {version['version_number']}",
            parent_version_id=version_id
        )

        # Update trip's active route
        await supabase.table("user_trips") \
            .update({"route_data": version["route_data"]}) \
            .eq("id", trip_id) \
            .execute()

        return {
            "version_id": new_version_id,
            "restored_from": version_id,
            "message": f"Successfully restored to version {version['version_number']}"
        }

    async def compare_versions(
        self,
        version_a_id: str,
        version_b_id: str
    ) -> Dict[str, Any]:
        """
        Compare two versions and return differences

        Returns:
            {
                "waypoints_added": [...],
                "waypoints_removed": [...],
                "waypoints_modified": [...],
                "settings_changed": {...},
                "distance_change_km": 15.5,
                "duration_change_hours": 0.5
            }
        """
        version_a = await self._get_version(version_a_id)
        version_b = await self._get_version(version_b_id)

        return self._calculate_diff(version_a["route_data"], version_b["route_data"])

    def _calculate_diff(
        self,
        route_a: Dict[str, Any],
        route_b: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate differences between two route versions"""
        diff = {
            "waypoints_added": [],
            "waypoints_removed": [],
            "waypoints_modified": [],
            "settings_changed": {}
        }

        # Compare waypoints
        waypoints_a = {wp["id"]: wp for wp in route_a.get("waypoints", [])}
        waypoints_b = {wp["id"]: wp for wp in route_b.get("waypoints", [])}

        # Find added waypoints
        for wp_id, wp_data in waypoints_b.items():
            if wp_id not in waypoints_a:
                diff["waypoints_added"].append(wp_data)

        # Find removed waypoints
        for wp_id, wp_data in waypoints_a.items():
            if wp_id not in waypoints_b:
                diff["waypoints_removed"].append(wp_data)

        # Find modified waypoints
        for wp_id in set(waypoints_a.keys()) & set(waypoints_b.keys()):
            if waypoints_a[wp_id] != waypoints_b[wp_id]:
                diff["waypoints_modified"].append({
                    "id": wp_id,
                    "before": waypoints_a[wp_id],
                    "after": waypoints_b[wp_id]
                })

        # Compare settings
        settings_a = route_a.get("settings", {})
        settings_b = route_b.get("settings", {})

        for key in set(settings_a.keys()) | set(settings_b.keys()):
            if settings_a.get(key) != settings_b.get(key):
                diff["settings_changed"][key] = {
                    "before": settings_a.get(key),
                    "after": settings_b.get(key)
                }

        # Calculate metric changes
        diff["distance_change_km"] = (
            route_b.get("total_distance_km", 0) - route_a.get("total_distance_km", 0)
        )

        diff["duration_change_hours"] = (
            route_b.get("estimated_duration_hours", 0) - route_a.get("estimated_duration_hours", 0)
        )

        return diff

    async def _get_version(self, version_id: str) -> Dict[str, Any]:
        """Fetch a version from database"""
        response = await supabase.table("route_versions") \
            .select("*") \
            .eq("id", version_id) \
            .single() \
            .execute()

        return response.data

    async def _get_next_version_number(self, trip_id: str) -> int:
        """Get next version number for a trip"""
        response = await supabase.table("route_versions") \
            .select("version_number") \
            .eq("trip_id", trip_id) \
            .order("version_number", desc=True) \
            .limit(1) \
            .execute()

        if response.data:
            return response.data[0]["version_number"] + 1
        return 1

    async def _cleanup_old_versions(self, trip_id: str):
        """Delete old versions if exceeding limit"""
        response = await supabase.table("route_versions") \
            .select("id") \
            .eq("trip_id", trip_id) \
            .order("version_number", desc=True) \
            .execute()

        if len(response.data) > self.max_versions_per_route:
            # Keep most recent versions, delete oldest
            to_delete = response.data[self.max_versions_per_route:]
            delete_ids = [v["id"] for v in to_delete]

            await supabase.table("route_versions") \
                .delete() \
                .in_("id", delete_ids) \
                .execute()
```

#### 2.2.2 Frontend Component

**Location:** `src/components/wheels/trip-planner/RouteVersioning.tsx`

```typescript
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, RotateCcw, GitBranch, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface RouteVersion {
  id: string;
  version_number: number;
  change_description: string;
  created_by: string;
  created_at: string;
}

interface RouteVersioningProps {
  tripId: string;
}

export const RouteVersioning: React.FC<RouteVersioningProps> = ({ tripId }) => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch version history
  const { data: versions, isLoading } = useQuery({
    queryKey: ['route-versions', tripId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/trips/${tripId}/versions`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      return response.json() as Promise<RouteVersion[]>;
    }
  });

  // Restore version mutation
  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await fetch(
        `/api/v1/trips/${tripId}/versions/${versionId}/restore`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', tripId] });
      queryClient.invalidateQueries({ queryKey: ['route-versions', tripId] });
      toast.success('Route restored successfully');
    },
    onError: () => {
      toast.error('Failed to restore route version');
    }
  });

  const handleRestore = async (versionId: string) => {
    if (confirm('Are you sure you want to restore this version? This will create a new version based on the selected one.')) {
      await restoreMutation.mutateAsync(versionId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin">
          <History className="w-6 h-6 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Version History</h3>
      </div>

      {versions && versions.length > 0 ? (
        <div className="space-y-2">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`
                border rounded-lg p-4 cursor-pointer transition-colors
                ${selectedVersion === version.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}
              `}
              onClick={() => setSelectedVersion(version.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      Version {version.version_number}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {version.change_description}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>

                {index !== 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(version.id);
                    }}
                    className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Restore this version"
                  >
                    <RotateCcw className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No version history yet</p>
          <p className="text-sm mt-1">Make changes to your route to create versions</p>
        </div>
      )}
    </div>
  );
};
```

### 2.3 Collaborative Editing Module

**Module Name:** `CollaborativeTripEditor`
**Location:** `backend/app/services/trip/collaborative_editor.py`

#### 2.3.1 Real-Time Sync Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client A (Editor 1)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                  WebSocket Hub (FastAPI)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Operational Transform Engine                 │ │
│  │  - Resolve concurrent edits                            │ │
│  │  - Maintain causal consistency                         │ │
│  │  - Broadcast changes to all clients                    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                    Client B (Editor 2)                      │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3.2 Backend Implementation

```python
from typing import List, Dict, Any, Optional, Set
from datetime import datetime
from fastapi import WebSocket
import json
import asyncio

class CollaborativeTripEditor:
    """
    Real-time collaborative editing for trips

    Features:
    - WebSocket-based real-time sync
    - Operational Transform for conflict resolution
    - Presence awareness (who's editing)
    - Cursor position sharing
    - Change attribution
    """

    def __init__(self):
        # Active connections per trip
        self.connections: Dict[str, Set[WebSocket]] = {}

        # User presence per trip
        self.presence: Dict[str, Dict[str, Any]] = {}

        # Pending operations queue
        self.operation_queue: Dict[str, List[Dict]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        trip_id: str,
        user_id: str,
        user_name: str
    ):
        """Connect a user to collaborative editing session"""
        await websocket.accept()

        # Add to connections
        if trip_id not in self.connections:
            self.connections[trip_id] = set()
        self.connections[trip_id].add(websocket)

        # Update presence
        if trip_id not in self.presence:
            self.presence[trip_id] = {}

        self.presence[trip_id][user_id] = {
            "user_id": user_id,
            "user_name": user_name,
            "connected_at": datetime.utcnow().isoformat(),
            "cursor_position": None
        }

        # Broadcast presence update to all clients
        await self._broadcast_presence(trip_id)

        try:
            while True:
                # Receive operations from client
                data = await websocket.receive_text()
                operation = json.loads(data)

                # Process operation
                await self._process_operation(trip_id, user_id, operation)

        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            # Cleanup on disconnect
            await self.disconnect(websocket, trip_id, user_id)

    async def disconnect(
        self,
        websocket: WebSocket,
        trip_id: str,
        user_id: str
    ):
        """Disconnect user from editing session"""
        # Remove from connections
        if trip_id in self.connections:
            self.connections[trip_id].discard(websocket)

            # Clean up if no more connections
            if not self.connections[trip_id]:
                del self.connections[trip_id]

        # Remove from presence
        if trip_id in self.presence and user_id in self.presence[trip_id]:
            del self.presence[trip_id][user_id]

            # Broadcast presence update
            await self._broadcast_presence(trip_id)

    async def _process_operation(
        self,
        trip_id: str,
        user_id: str,
        operation: Dict[str, Any]
    ):
        """
        Process an editing operation

        Operation types:
        - add_waypoint: Add a new waypoint
        - remove_waypoint: Remove a waypoint
        - move_waypoint: Change waypoint order
        - update_waypoint: Modify waypoint data
        - cursor_move: Update cursor position
        """
        operation_type = operation.get("type")

        if operation_type == "cursor_move":
            # Update cursor position in presence
            self.presence[trip_id][user_id]["cursor_position"] = operation.get("position")
            await self._broadcast_presence(trip_id)
            return

        # Transform operation if needed (handle concurrent edits)
        transformed_op = await self._transform_operation(trip_id, operation)

        # Apply operation to database
        await self._apply_operation(trip_id, transformed_op)

        # Broadcast operation to all connected clients except sender
        await self._broadcast_operation(
            trip_id,
            exclude_user=user_id,
            operation=transformed_op
        )

    async def _transform_operation(
        self,
        trip_id: str,
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Operational Transform algorithm

        Resolves conflicts when multiple users edit simultaneously
        """
        # Get pending operations for this trip
        pending = self.operation_queue.get(trip_id, [])

        transformed = operation.copy()

        # Transform against each pending operation
        for pending_op in pending:
            if operation["type"] == "add_waypoint" and pending_op["type"] == "add_waypoint":
                # Both adding waypoints - adjust indices
                if operation["index"] >= pending_op["index"]:
                    transformed["index"] += 1

            elif operation["type"] == "remove_waypoint" and pending_op["type"] == "remove_waypoint":
                # Both removing waypoints - adjust indices
                if operation["index"] > pending_op["index"]:
                    transformed["index"] -= 1
                elif operation["index"] == pending_op["index"]:
                    # Same waypoint removed - skip this operation
                    return None

            elif operation["type"] == "move_waypoint" and pending_op["type"] == "add_waypoint":
                # Moving waypoint while another is being added
                if operation["from_index"] >= pending_op["index"]:
                    transformed["from_index"] += 1
                if operation["to_index"] >= pending_op["index"]:
                    transformed["to_index"] += 1

        return transformed

    async def _apply_operation(
        self,
        trip_id: str,
        operation: Dict[str, Any]
    ):
        """Apply operation to database"""
        if operation is None:
            return

        # Fetch current trip data
        trip = await supabase.table("user_trips") \
            .select("route_data") \
            .eq("id", trip_id) \
            .single() \
            .execute()

        route_data = trip.data["route_data"]
        waypoints = route_data.get("waypoints", [])

        # Apply operation
        if operation["type"] == "add_waypoint":
            waypoints.insert(operation["index"], operation["waypoint"])

        elif operation["type"] == "remove_waypoint":
            if 0 <= operation["index"] < len(waypoints):
                waypoints.pop(operation["index"])

        elif operation["type"] == "move_waypoint":
            if 0 <= operation["from_index"] < len(waypoints):
                waypoint = waypoints.pop(operation["from_index"])
                waypoints.insert(operation["to_index"], waypoint)

        elif operation["type"] == "update_waypoint":
            if 0 <= operation["index"] < len(waypoints):
                waypoints[operation["index"]].update(operation["updates"])

        # Save updated route data
        route_data["waypoints"] = waypoints

        await supabase.table("user_trips") \
            .update({"route_data": route_data}) \
            .eq("id", trip_id) \
            .execute()

    async def _broadcast_operation(
        self,
        trip_id: str,
        exclude_user: str,
        operation: Dict[str, Any]
    ):
        """Broadcast operation to all connected clients except sender"""
        if trip_id not in self.connections:
            return

        message = json.dumps({
            "type": "operation",
            "operation": operation,
            "user_id": exclude_user,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Send to all connections
        for websocket in self.connections[trip_id]:
            try:
                await websocket.send_text(message)
            except Exception as e:
                print(f"Error broadcasting: {e}")

    async def _broadcast_presence(self, trip_id: str):
        """Broadcast presence information to all connected clients"""
        if trip_id not in self.connections:
            return

        presence_data = list(self.presence.get(trip_id, {}).values())

        message = json.dumps({
            "type": "presence",
            "users": presence_data
        })

        for websocket in self.connections[trip_id]:
            try:
                await websocket.send_text(message)
            except Exception as e:
                print(f"Error broadcasting presence: {e}")
```

#### 2.3.3 Frontend Collaborative Component

**Location:** `src/components/wheels/trip-planner/CollaborativeEditor.tsx`

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { Users, Circle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface User {
  user_id: string;
  user_name: string;
  connected_at: string;
  cursor_position: { lat: number; lng: number } | null;
}

interface CollaborativeEditorProps {
  tripId: string;
  currentUserId: string;
  currentUserName: string;
  onOperationReceived: (operation: any) => void;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  tripId,
  currentUserId,
  currentUserName,
  onOperationReceived
}) => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to collaborative editing WebSocket
    const token = localStorage.getItem('authToken');
    const ws = new WebSocket(
      `wss://pam-backend.onrender.com/ws/trips/${tripId}/collaborate?token=${token}&user_id=${currentUserId}&user_name=${encodeURIComponent(currentUserName)}`
    );

    ws.onopen = () => {
      console.log('Connected to collaborative editing session');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'presence') {
        setActiveUsers(message.users);
      } else if (message.type === 'operation') {
        // Received operation from another user
        onOperationReceived(message.operation);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Disconnected from collaborative editing session');
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [tripId, currentUserId, currentUserName]);

  const sendOperation = (operation: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(operation));
    }
  };

  const sendCursorPosition = (position: { lat: number; lng: number }) => {
    sendOperation({
      type: 'cursor_move',
      position
    });
  };

  // Expose sendOperation to parent component
  useEffect(() => {
    (window as any).sendCollaborativeOperation = sendOperation;
  }, []);

  const otherUsers = activeUsers.filter(u => u.user_id !== currentUserId);

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-50">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">
          {activeUsers.length} Active {activeUsers.length === 1 ? 'User' : 'Users'}
        </span>
      </div>

      <div className="space-y-2">
        {activeUsers.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {user.user_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Circle
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-green-500 stroke-white stroke-2`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.user_name}
                {user.user_id === currentUserId && (
                  <span className="text-xs text-gray-500 ml-1">(You)</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {otherUsers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Changes sync in real-time across all editors
          </p>
        </div>
      )}
    </div>
  );
};
```

---

## 3. Data Models

### 3.1 Core Trip Data Model

```typescript
interface Trip {
  id: string;
  user_id: string;
  title: string;
  description: string | null;

  // Route data
  route_data: {
    waypoints: Waypoint[];
    route_geometry: GeoJSON.LineString;
    settings: RouteSettings;
  };

  // GPX import data (if from GPX)
  gpx_data?: {
    metadata: GPXMetadata;
    waypoints: GPXWaypoint[];
    routes: GPXRoute[];
    tracks: GPXTrack[];
  };

  // Metrics
  total_distance_km: number;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  estimated_duration_hours: number | null;

  // Budgeting
  total_budget: number | null;
  estimated_fuel_cost: number | null;
  estimated_lodging_cost: number | null;

  // Status
  status: 'planning' | 'active' | 'completed' | 'archived';
  trip_type: 'road_trip' | 'rv_journey' | 'vacation' | 'relocation';

  // Collaboration
  collaborators: string[];  // Array of user_ids
  is_shared: boolean;

  // Timestamps
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;

  // Metadata
  source: 'manual' | 'gpx_import' | 'template' | 'pam_ai';
  imported_at: string | null;
  version: number;
}

interface Waypoint {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  order: number;

  // Waypoint type
  type: 'start' | 'waypoint' | 'stop' | 'campground' | 'fuel' | 'attraction' | 'destination';

  // Optional data
  address: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  duration_minutes: number | null;

  // Metadata
  created_at: string;
  created_by: string;
}

interface RouteSettings {
  avoid_highways: boolean;
  avoid_tolls: boolean;
  vehicle_type: 'car' | 'rv' | 'motorcycle';

  // RV-specific
  vehicle_height_ft: number | null;
  vehicle_weight_lbs: number | null;
  vehicle_length_ft: number | null;

  // Preferences
  max_driving_hours_per_day: number;
  preferred_arrival_time: string | null;
}
```

### 3.2 Equipment Inventory Model

```typescript
interface EquipmentItem {
  id: string;
  user_id: string;
  name: string;
  category: string;

  // Status
  status: 'owned' | 'needed' | 'rented' | 'retired';
  condition: 'excellent' | 'good' | 'fair' | 'poor';

  // Location
  storage_location: string | null;
  vehicle_location: string | null;

  // Maintenance
  last_service_date: string | null;
  next_service_date: string | null;
  maintenance_interval_days: number | null;
  maintenance_notes: string | null;

  // Purchase info
  purchase_date: string | null;
  purchase_price: number | null;
  warranty_expiration: string | null;

  // Documentation
  photos: string[];
  manual_url: string | null;
  serial_number: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}
```

### 3.3 Vehicle Readiness Checklist Model

```typescript
interface ReadinessChecklist {
  id: string;
  user_id: string;
  trip_id: string | null;
  name: string;

  // Template or custom
  is_template: boolean;
  template_id: string | null;

  // Checklist items
  items: ChecklistItem[];

  // Progress
  completed_count: number;
  total_count: number;
  completion_percentage: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  description: string | null;

  // Status
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;

  // Priority
  priority: 'critical' | 'important' | 'optional';
  order: number;

  // Equipment link
  equipment_item_id: string | null;

  // Notes
  notes: string | null;
}
```

---

## 4. API Specifications

### 4.1 Trip Management Endpoints

#### POST /api/v1/trips/import-gpx
```typescript
Request:
  multipart/form-data
  - file: File (GPX file)
  - filename: string
  - trip_name?: string (optional custom name)

Response: 200 OK
{
  "trip_id": "uuid",
  "waypoints_count": 150,
  "total_distance_km": 1420.5,
  "elevation_gain_m": 3500,
  "elevation_loss_m": 3200,
  "duration_hours": 18.5,
  "warnings": ["Timestamps missing for some waypoints"]
}

Errors:
  400 - Invalid GPX format
  413 - File too large (>10MB)
  422 - Validation error
```

#### GET /api/v1/trips/{trip_id}/export-gpx
```typescript
Request:
  Query Parameters:
  - include_waypoints: boolean (default: true)
  - include_elevation: boolean (default: true)

Response: 200 OK
  Content-Type: application/gpx+xml
  Content-Disposition: attachment; filename="trip-{trip_id}.gpx"

  [GPX file binary data]

Errors:
  404 - Trip not found
  403 - Unauthorized access
```

#### GET /api/v1/trips/{trip_id}/versions
```typescript
Request:
  Query Parameters:
  - limit: number (default: 20)

Response: 200 OK
{
  "versions": [
    {
      "id": "uuid",
      "version_number": 15,
      "change_description": "Added scenic overlook stop",
      "created_by": "uuid",
      "created_at": "2025-01-15T10:30:00Z"
    },
    ...
  ],
  "total": 15
}
```

#### POST /api/v1/trips/{trip_id}/versions/{version_id}/restore
```typescript
Request: (empty body)

Response: 200 OK
{
  "version_id": "new-version-uuid",
  "restored_from": "old-version-uuid",
  "message": "Successfully restored to version 12"
}

Errors:
  404 - Version not found
  403 - Unauthorized access
```

#### POST /api/v1/trips/{trip_id}/share
```typescript
Request:
{
  "collaborator_email": "friend@example.com",
  "permission": "edit" | "view",
  "message": "Check out our trip plan!"
}

Response: 201 Created
{
  "share_id": "uuid",
  "collaborator_user_id": "uuid",
  "permission": "edit",
  "shared_at": "2025-01-15T10:30:00Z",
  "invitation_sent": true
}

Errors:
  404 - User not found
  409 - Already shared with this user
```

### 4.2 Equipment Management Endpoints

#### POST /api/v1/equipment
```typescript
Request:
{
  "name": "Portable Solar Panel",
  "category": "Power & Electronics",
  "status": "owned",
  "condition": "excellent",
  "storage_location": "Garage, Shelf 3",
  "purchase_date": "2024-06-15",
  "purchase_price": 299.99,
  "maintenance_interval_days": 365
}

Response: 201 Created
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Portable Solar Panel",
  ...
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### GET /api/v1/equipment
```typescript
Request:
  Query Parameters:
  - category: string (optional)
  - status: 'owned' | 'needed' | 'rented' | 'retired' (optional)
  - condition: string (optional)
  - needs_maintenance: boolean (optional)

Response: 200 OK
{
  "equipment": [
    {
      "id": "uuid",
      "name": "Portable Solar Panel",
      "category": "Power & Electronics",
      "status": "owned",
      "condition": "excellent",
      "maintenance_due": false,
      "next_service_date": "2025-06-15"
    },
    ...
  ],
  "total": 45,
  "needs_maintenance_count": 3
}
```

#### POST /api/v1/equipment/{equipment_id}/maintenance
```typescript
Request:
{
  "service_type": "inspection" | "repair" | "replacement",
  "description": "Annual inspection and cleaning",
  "cost": 0,
  "performed_by": "Self",
  "next_service_interval_days": 365
}

Response: 201 Created
{
  "id": "uuid",
  "equipment_id": "uuid",
  "service_date": "2025-01-15",
  "next_service_date": "2026-01-15",
  "notes": "Panel cleaned, connections checked, output voltage normal"
}
```

### 4.3 Offline Map Endpoints

#### POST /api/v1/offline-maps/download
```typescript
Request:
{
  "trip_id": "uuid",
  "zoom_levels": [10, 11, 12, 13],
  "buffer_km": 5
}

Response: 202 Accepted
{
  "download_id": "uuid",
  "estimated_tiles": 1500,
  "estimated_size_mb": 45.2,
  "status": "queued"
}
```

#### GET /api/v1/offline-maps/download/{download_id}/status
```typescript
Response: 200 OK
{
  "download_id": "uuid",
  "status": "downloading" | "completed" | "failed",
  "progress_percent": 67,
  "tiles_downloaded": 1005,
  "tiles_total": 1500,
  "size_downloaded_mb": 30.3
}
```

---

## 5. Frontend Components

### 5.1 Component Hierarchy

```
TripPlannerEnhanced/
├── GPXImporter.tsx (drag & drop GPX upload)
├── GPXExporter.tsx (export trip to GPX)
├── RouteVersioning.tsx (version history, restore)
├── CollaborativeEditor.tsx (real-time sync, presence)
├── EquipmentInventory.tsx (equipment management)
│   ├── EquipmentList.tsx
│   ├── EquipmentDetail.tsx
│   └── MaintenanceSchedule.tsx
├── ReadinessChecklist.tsx (pre-trip checklists)
│   ├── ChecklistTemplate.tsx
│   ├── ChecklistItem.tsx
│   └── ChecklistProgress.tsx
├── OfflineMapManager.tsx (offline map download)
│   ├── MapDownloadDialog.tsx
│   ├── MapStorageUsage.tsx
│   └── MapTileViewer.tsx
└── CommunityFeatures.tsx (route sharing, reviews)
    ├── RouteShareDialog.tsx
    ├── RouteReviews.tsx
    └── RouteDiscovery.tsx
```

### 5.2 State Management Strategy

**Using Zustand with Persistence:**

```typescript
// src/stores/tripStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';

interface TripStore {
  // Active trip
  activeTrip: Trip | null;
  setActiveTrip: (trip: Trip | null) => void;

  // Route editing
  waypoints: Waypoint[];
  addWaypoint: (waypoint: Waypoint) => void;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  reorderWaypoints: (fromIndex: number, toIndex: number) => void;

  // Collaborative editing
  collaborativeSession: CollaborativeSession | null;
  activeCollaborators: User[];

  // Offline mode
  isOffline: boolean;
  pendingOperations: Operation[];
  addPendingOperation: (operation: Operation) => void;
  clearPendingOperations: () => void;
}

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      activeTrip: null,
      setActiveTrip: (trip) => set({ activeTrip: trip }),

      waypoints: [],
      addWaypoint: (waypoint) => set((state) => ({
        waypoints: [...state.waypoints, waypoint]
      })),
      removeWaypoint: (id) => set((state) => ({
        waypoints: state.waypoints.filter(wp => wp.id !== id)
      })),
      updateWaypoint: (id, updates) => set((state) => ({
        waypoints: state.waypoints.map(wp =>
          wp.id === id ? { ...wp, ...updates } : wp
        )
      })),
      reorderWaypoints: (fromIndex, toIndex) => set((state) => {
        const waypoints = [...state.waypoints];
        const [removed] = waypoints.splice(fromIndex, 1);
        waypoints.splice(toIndex, 0, removed);
        return { waypoints };
      }),

      collaborativeSession: null,
      activeCollaborators: [],

      isOffline: false,
      pendingOperations: [],
      addPendingOperation: (operation) => set((state) => ({
        pendingOperations: [...state.pendingOperations, operation]
      })),
      clearPendingOperations: () => set({ pendingOperations: [] })
    }),
    {
      name: 'trip-storage',
      partialize: (state) => ({
        // Only persist essential data
        activeTrip: state.activeTrip,
        waypoints: state.waypoints,
        pendingOperations: state.pendingOperations
      })
    }
  )
);
```

### 5.3 Offline Support Pattern

```typescript
// src/utils/offlineSync.ts
import localforage from 'localforage';
import { useTripStore } from '@/stores/tripStore';

export class OfflineSyncManager {
  private db: LocalForage;

  constructor() {
    this.db = localforage.createInstance({
      name: 'wheels-wins-offline'
    });
  }

  async queueOperation(operation: Operation) {
    // Add to pending operations
    useTripStore.getState().addPendingOperation(operation);

    // Store in IndexedDB for persistence
    await this.db.setItem(`operation-${operation.id}`, operation);
  }

  async syncPendingOperations() {
    const pendingOps = useTripStore.getState().pendingOperations;

    for (const operation of pendingOps) {
      try {
        // Attempt to sync with server
        await this.executeOperation(operation);

        // Remove from pending if successful
        await this.db.removeItem(`operation-${operation.id}`);
      } catch (error) {
        console.error('Failed to sync operation:', error);
        // Keep in pending queue for retry
      }
    }

    // Clear successfully synced operations
    useTripStore.getState().clearPendingOperations();
  }

  async executeOperation(operation: Operation) {
    const response = await fetch('/api/v1/trips/operations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(operation)
    });

    if (!response.ok) {
      throw new Error('Operation failed');
    }
  }
}
```

---

## 6. Backend Services

### 6.1 Service Layer Architecture

```
backend/app/services/trip/
├── gpx_processor.py (GPX import/export)
├── route_versioning.py (version control)
├── collaborative_editor.py (real-time collaboration)
├── equipment_manager.py (equipment inventory)
├── checklist_generator.py (pre-trip checklists)
├── offline_map_service.py (map tile management)
└── community_service.py (route sharing, reviews)
```

### 6.2 Equipment Manager Service

```python
# backend/app/services/trip/equipment_manager.py
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import and_, or_

class EquipmentManager:
    """
    Equipment inventory management service

    Features:
    - Track equipment ownership and condition
    - Maintenance scheduling and reminders
    - Integration with trip checklists
    - Purchase history and warranty tracking
    """

    def __init__(self, user_id: str):
        self.user_id = user_id

    async def add_equipment(
        self,
        name: str,
        category: str,
        status: str = "owned",
        **kwargs
    ) -> Dict[str, Any]:
        """Add new equipment item"""
        equipment_data = {
            "id": str(uuid4()),
            "user_id": self.user_id,
            "name": name,
            "category": category,
            "status": status,
            "condition": kwargs.get("condition", "good"),
            "storage_location": kwargs.get("storage_location"),
            "vehicle_location": kwargs.get("vehicle_location"),
            "purchase_date": kwargs.get("purchase_date"),
            "purchase_price": kwargs.get("purchase_price"),
            "maintenance_interval_days": kwargs.get("maintenance_interval_days"),
            "created_at": datetime.utcnow().isoformat()
        }

        response = await supabase.table("equipment_inventory_extended").insert(equipment_data).execute()

        return response.data[0]

    async def get_maintenance_due(
        self,
        days_ahead: int = 30
    ) -> List[Dict[str, Any]]:
        """Get equipment needing maintenance soon"""
        cutoff_date = (datetime.utcnow() + timedelta(days=days_ahead)).date()

        response = await supabase.table("equipment_inventory_extended") \
            .select("*") \
            .eq("user_id", self.user_id) \
            .lte("next_service_date", cutoff_date.isoformat()) \
            .order("next_service_date") \
            .execute()

        return response.data

    async def log_maintenance(
        self,
        equipment_id: str,
        service_type: str,
        description: str,
        cost: float = 0,
        **kwargs
    ) -> Dict[str, Any]:
        """Log maintenance performed on equipment"""
        # Get equipment to calculate next service date
        equipment = await self._get_equipment(equipment_id)

        # Calculate next service date
        interval_days = kwargs.get(
            "next_service_interval_days",
            equipment.get("maintenance_interval_days", 365)
        )

        next_service_date = (datetime.utcnow() + timedelta(days=interval_days)).date()

        # Log maintenance
        maintenance_data = {
            "id": str(uuid4()),
            "equipment_id": equipment_id,
            "service_type": service_type,
            "description": description,
            "service_date": datetime.utcnow().date().isoformat(),
            "cost": cost,
            "performed_by": kwargs.get("performed_by", "Self"),
            "next_service_date": next_service_date.isoformat(),
            "notes": kwargs.get("notes"),
            "created_at": datetime.utcnow().isoformat()
        }

        await supabase.table("equipment_maintenance_log").insert(maintenance_data).execute()

        # Update equipment's last service date
        await supabase.table("equipment_inventory_extended") \
            .update({
                "last_service_date": maintenance_data["service_date"],
                "next_service_date": maintenance_data["next_service_date"]
            }) \
            .eq("id", equipment_id) \
            .execute()

        return maintenance_data

    async def generate_trip_checklist(
        self,
        trip_id: str,
        categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate equipment checklist for a trip

        Analyzes trip destination, duration, and user's equipment
        to create comprehensive packing checklist
        """
        # Get trip details
        trip = await self._get_trip(trip_id)

        # Get user's equipment filtered by category
        if categories:
            equipment_query = supabase.table("equipment_inventory_extended") \
                .select("*") \
                .eq("user_id", self.user_id) \
                .in_("category", categories)
        else:
            equipment_query = supabase.table("equipment_inventory_extended") \
                .select("*") \
                .eq("user_id", self.user_id)

        equipment = (await equipment_query.execute()).data

        # Create checklist items from equipment
        checklist_items = []

        for item in equipment:
            if item["status"] == "owned":
                checklist_items.append({
                    "equipment_item_id": item["id"],
                    "task": f"Pack {item['name']}",
                    "category": item["category"],
                    "priority": self._determine_priority(item, trip),
                    "completed": False
                })

        # Add standard items not in equipment inventory
        standard_items = self._get_standard_trip_items(trip)
        checklist_items.extend(standard_items)

        # Create checklist
        checklist_data = {
            "id": str(uuid4()),
            "user_id": self.user_id,
            "trip_id": trip_id,
            "name": f"Trip Checklist - {trip['title']}",
            "is_template": False,
            "items": checklist_items,
            "completed_count": 0,
            "total_count": len(checklist_items),
            "completion_percentage": 0,
            "created_at": datetime.utcnow().isoformat()
        }

        response = await supabase.table("vehicle_readiness_checklists").insert(checklist_data).execute()

        return response.data[0]

    def _determine_priority(
        self,
        equipment: Dict[str, Any],
        trip: Dict[str, Any]
    ) -> str:
        """Determine priority based on trip and equipment"""
        category = equipment["category"].lower()

        # Critical items for all trips
        critical_categories = ["safety", "medical", "navigation"]
        if any(cat in category for cat in critical_categories):
            return "critical"

        # Important for RV trips
        if trip.get("trip_type") == "rv_journey":
            important_categories = ["power", "water", "waste"]
            if any(cat in category for cat in important_categories):
                return "important"

        return "optional"

    def _get_standard_trip_items(self, trip: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get standard checklist items based on trip type"""
        items = [
            {
                "task": "Check vehicle fluids (oil, coolant, windshield washer)",
                "category": "Vehicle Maintenance",
                "priority": "critical",
                "completed": False
            },
            {
                "task": "Verify tire pressure and spare tire",
                "category": "Vehicle Maintenance",
                "priority": "critical",
                "completed": False
            },
            {
                "task": "Pack first aid kit",
                "category": "Safety",
                "priority": "critical",
                "completed": False
            },
            {
                "task": "Load route on GPS device",
                "category": "Navigation",
                "priority": "important",
                "completed": False
            }
        ]

        if trip.get("trip_type") == "rv_journey":
            items.extend([
                {
                    "task": "Empty waste tanks",
                    "category": "RV Preparation",
                    "priority": "critical",
                    "completed": False
                },
                {
                    "task": "Fill fresh water tank",
                    "category": "RV Preparation",
                    "priority": "important",
                    "completed": False
                },
                {
                    "task": "Check propane levels",
                    "category": "RV Preparation",
                    "priority": "important",
                    "completed": False
                }
            ])

        return items
```

---

## 7. Database Schema

### 7.1 New Tables (from INTEGRATION_PLAN.md)

**Already documented in INTEGRATION_PLAN.md Phase 1:**
- `trip_templates_extended`
- `vehicle_readiness_checklists`
- `equipment_inventory_extended`
- `trip_collaborators`
- `route_versions`
- `offline_map_tiles`
- `community_trip_reviews`

### 7.2 Indexes for Performance

```sql
-- High-traffic queries need indexes

-- Trip queries by user
CREATE INDEX idx_trips_user_id_status ON user_trips(user_id, status);
CREATE INDEX idx_trips_user_id_created_at ON user_trips(user_id, created_at DESC);

-- Equipment maintenance due date queries
CREATE INDEX idx_equipment_user_id_next_service ON equipment_inventory_extended(user_id, next_service_date);

-- Collaborative trips by user
CREATE INDEX idx_collaborators_user_id_trip_id ON trip_collaborators(collaborator_user_id, trip_id);

-- Route version history
CREATE INDEX idx_route_versions_trip_id_version ON route_versions(trip_id, version_number DESC);

-- Offline map tiles spatial index
CREATE INDEX idx_map_tiles_spatial ON offline_map_tiles(trip_id, zoom_level, tile_x, tile_y);

-- Community reviews by trip
CREATE INDEX idx_reviews_trip_id_rating ON community_trip_reviews(trip_id, rating DESC);
```

---

## 8. Security & Permissions

### 8.1 Authorization Model

```typescript
enum Permission {
  // Trip permissions
  TRIP_VIEW = 'trip:view',
  TRIP_EDIT = 'trip:edit',
  TRIP_DELETE = 'trip:delete',
  TRIP_SHARE = 'trip:share',

  // Equipment permissions
  EQUIPMENT_VIEW = 'equipment:view',
  EQUIPMENT_EDIT = 'equipment:edit',
  EQUIPMENT_DELETE = 'equipment:delete',

  // Collaborative editing
  COLLAB_JOIN = 'collab:join',
  COLLAB_EDIT = 'collab:edit',
  COLLAB_INVITE = 'collab:invite',

  // Map data
  OFFLINE_MAPS_DOWNLOAD = 'maps:download',
}

interface TripPermissions {
  trip_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: Permission[];
  granted_at: string;
  granted_by: string;
}
```

### 8.2 Row Level Security (RLS) Policies

```sql
-- Trip access control
CREATE POLICY trip_access_policy ON user_trips
  FOR ALL
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM trip_collaborators
      WHERE trip_id = user_trips.id
      AND collaborator_user_id = auth.uid()
      AND permission IN ('edit', 'view')
    )
  );

-- Equipment - user can only access their own
CREATE POLICY equipment_user_policy ON equipment_inventory_extended
  FOR ALL
  USING (user_id = auth.uid());

-- Route versions - access follows trip access
CREATE POLICY route_version_access ON route_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_trips
      WHERE id = route_versions.trip_id
      AND (
        user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators
          WHERE trip_id = user_trips.id
          AND collaborator_user_id = auth.uid()
        )
      )
    )
  );

-- Checklist access - tied to trip
CREATE POLICY checklist_access ON vehicle_readiness_checklists
  FOR ALL
  USING (
    user_id = auth.uid()
    OR
    (trip_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_trips
      WHERE id = vehicle_readiness_checklists.trip_id
      AND (
        user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators
          WHERE trip_id = user_trips.id
          AND collaborator_user_id = auth.uid()
        )
      )
    ))
  );
```

### 8.3 Data Validation

```python
# backend/app/services/validation/trip_validator.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional

class WaypointCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: Optional[float] = Field(None, ge=-500, le=9000)
    order: int = Field(..., ge=0)
    type: str = Field(..., pattern="^(start|waypoint|stop|campground|fuel|attraction|destination)$")

    @validator('latitude')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v

    @validator('longitude')
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v

class TripCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    waypoints: List[WaypointCreate] = Field(..., min_items=2, max_items=100)
    total_budget: Optional[float] = Field(None, gt=0, le=1000000)

    @validator('waypoints')
    def validate_waypoints(cls, v):
        if len(v) < 2:
            raise ValueError('Trip must have at least 2 waypoints (start and destination)')

        # Ensure first is 'start' and last is 'destination'
        if v[0].type != 'start':
            raise ValueError('First waypoint must be type "start"')
        if v[-1].type != 'destination':
            raise ValueError('Last waypoint must be type "destination"')

        return v

class GPXImportRequest(BaseModel):
    filename: str = Field(..., pattern=r'.*\.gpx$')
    trip_name: Optional[str] = Field(None, max_length=200)

    @validator('filename')
    def validate_filename(cls, v):
        if not v.lower().endswith('.gpx'):
            raise ValueError('File must be a .gpx file')
        return v
```

---

## 9. Performance Requirements

### 9.1 Response Time Targets

| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| GPX Import (5MB file) | <5s | <10s | Background processing for large files |
| GPX Export | <2s | <5s | Cached if no changes |
| Route Version Save | <500ms | <1s | Optimistic UI update |
| Collaborative Edit Sync | <100ms | <300ms | WebSocket latency |
| Offline Map Download (1000 tiles) | <30s | <60s | Background download |
| Equipment List Load | <500ms | <1s | Cached after first load |
| Checklist Generation | <2s | <5s | AI-based suggestions |

### 9.2 Scalability Targets

- **Concurrent Users per Trip:** 10 simultaneous editors
- **Total Waypoints per Trip:** 10,000 maximum
- **GPX File Size:** 10MB maximum
- **Offline Map Storage:** 500MB per user
- **Equipment Items per User:** 1,000 maximum
- **Route Versions Retained:** 50 most recent

### 9.3 Optimization Strategies

**Database Query Optimization:**
```python
# Use select() to fetch only needed columns
response = await supabase.table("user_trips") \
    .select("id, title, total_distance_km, status") \  # Not "select('*')"
    .eq("user_id", user_id) \
    .execute()

# Use pagination for large result sets
response = await supabase.table("equipment_inventory_extended") \
    .select("*") \
    .eq("user_id", user_id) \
    .range(0, 49) \  # Fetch 50 at a time
    .execute()

# Use indexes for common queries
# (Already defined in Section 7.2)
```

**Caching Strategy (Redis):**
```python
from redis import asyncio as aioredis

class CacheManager:
    def __init__(self):
        self.redis = aioredis.from_url("redis://localhost")

    async def cache_trip(self, trip_id: str, trip_data: Dict):
        """Cache trip data for 5 minutes"""
        await self.redis.setex(
            f"trip:{trip_id}",
            300,  # 5 minutes TTL
            json.dumps(trip_data)
        )

    async def get_cached_trip(self, trip_id: str) -> Optional[Dict]:
        """Retrieve cached trip data"""
        cached = await self.redis.get(f"trip:{trip_id}")
        if cached:
            return json.loads(cached)
        return None

    async def invalidate_trip(self, trip_id: str):
        """Invalidate trip cache on update"""
        await self.redis.delete(f"trip:{trip_id}")
```

**Frontend Performance:**
```typescript
// Lazy load heavy components
const GPXImporter = lazy(() => import('./GPXImporter'));
const RouteVersioning = lazy(() => import('./RouteVersioning'));
const CollaborativeEditor = lazy(() => import('./CollaborativeEditor'));

// Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

const EquipmentList = () => {
  const parentRef = useRef<HTMLDivElement>(null);
  const { data: equipment } = useQuery(['equipment']);

  const virtualizer = useVirtualizer({
    count: equipment.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map(virtualRow => (
        <EquipmentItem
          key={virtualRow.index}
          equipment={equipment[virtualRow.index]}
        />
      ))}
    </div>
  );
};

// Debounce expensive operations
import { useDebouncedCallback } from 'use-debounce';

const handleWaypointUpdate = useDebouncedCallback(
  (waypointId: string, updates: Partial<Waypoint>) => {
    updateWaypoint(waypointId, updates);
  },
  500 // Wait 500ms after last change before saving
);
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Backend (pytest):**
```python
# backend/tests/services/test_gpx_processor.py
import pytest
from app.services.trip.gpx_processor import GPXProcessor

@pytest.fixture
def gpx_processor():
    return GPXProcessor(user_id="test-user-id")

@pytest.fixture
def sample_gpx_file():
    return """<?xml version="1.0"?>
<gpx version="1.1" creator="test">
    <wpt lat="37.7749" lon="-122.4194">
        <name>San Francisco</name>
        <ele>16</ele>
    </wpt>
    <wpt lat="34.0522" lon="-118.2437">
        <name>Los Angeles</name>
        <ele>71</ele>
    </wpt>
</gpx>"""

async def test_import_gpx_valid_file(gpx_processor, sample_gpx_file):
    """Test GPX import with valid file"""
    result = await gpx_processor.import_gpx(
        file_content=sample_gpx_file.encode('utf-8'),
        filename="test.gpx",
        trip_name="California Tour"
    )

    assert result["trip_id"] is not None
    assert result["waypoints_count"] == 2
    assert result["warnings"] == []

async def test_import_gpx_file_too_large(gpx_processor):
    """Test GPX import rejects oversized files"""
    large_file = b"x" * (11 * 1024 * 1024)  # 11MB

    with pytest.raises(FileSizeError):
        await gpx_processor.import_gpx(
            file_content=large_file,
            filename="large.gpx"
        )

async def test_export_gpx_preserves_elevation(gpx_processor, sample_gpx_file):
    """Test GPX export preserves elevation data"""
    # Import first
    import_result = await gpx_processor.import_gpx(
        file_content=sample_gpx_file.encode('utf-8'),
        filename="test.gpx"
    )

    # Export
    exported = await gpx_processor.export_gpx(
        trip_id=import_result["trip_id"],
        include_elevation=True
    )

    # Parse exported GPX
    exported_gpx = gpxpy.parse(exported.decode('utf-8'))

    # Verify elevation preserved
    assert exported_gpx.waypoints[0].elevation == 16
    assert exported_gpx.waypoints[1].elevation == 71
```

**Frontend (Vitest + React Testing Library):**
```typescript
// src/components/wheels/trip-planner/__tests__/GPXImporter.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GPXImporter } from '../GPXImporter';

describe('GPXImporter', () => {
  it('renders dropzone', () => {
    render(<GPXImporter />);
    expect(screen.getByText(/drag & drop gpx file/i)).toBeInTheDocument();
  });

  it('accepts .gpx files', async () => {
    const file = new File(['<gpx></gpx>'], 'test.gpx', { type: 'application/gpx+xml' });

    render(<GPXImporter />);

    const input = screen.getByLabelText(/drag & drop/i);
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/importing gpx file/i)).toBeInTheDocument();
    });
  });

  it('rejects non-GPX files', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });

    render(<GPXImporter />);

    const input = screen.getByLabelText(/drag & drop/i);
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
  });

  it('rejects files over 10MB', async () => {
    // Create a mock file over 10MB
    const largeFile = new File(
      [new ArrayBuffer(11 * 1024 * 1024)],
      'large.gpx',
      { type: 'application/gpx+xml' }
    );

    render(<GPXImporter />);

    const input = screen.getByLabelText(/drag & drop/i);
    await userEvent.upload(input, largeFile);

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });
});
```

### 10.2 Integration Tests

```typescript
// src/__tests__/integration/trip-collaborative-editing.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CollaborativeEditor } from '@/components/wheels/trip-planner/CollaborativeEditor';
import { setupWebSocketMock, cleanupWebSocketMock } from '@/test-utils/websocket-mock';

describe('Collaborative Trip Editing Integration', () => {
  beforeEach(() => {
    setupWebSocketMock();
  });

  afterEach(() => {
    cleanupWebSocketMock();
  });

  it('syncs waypoint additions across clients', async () => {
    // Render two instances (simulating two users)
    const { rerender: rerender1 } = render(
      <CollaborativeEditor
        tripId="test-trip-1"
        currentUserId="user-1"
        currentUserName="Alice"
        onOperationReceived={(op) => console.log('User 1 received:', op)}
      />
    );

    const { rerender: rerender2 } = render(
      <CollaborativeEditor
        tripId="test-trip-1"
        currentUserId="user-2"
        currentUserName="Bob"
        onOperationReceived={(op) => console.log('User 2 received:', op)}
      />
    );

    // User 1 adds a waypoint
    const operation = {
      type: 'add_waypoint',
      index: 2,
      waypoint: {
        id: 'new-waypoint-1',
        name: 'Grand Canyon',
        latitude: 36.1069,
        longitude: -112.1129
      }
    };

    (window as any).sendCollaborativeOperation(operation);

    // Verify User 2 receives the operation
    await waitFor(() => {
      expect(screen.getByText(/grand canyon/i)).toBeInTheDocument();
    });
  });

  it('resolves concurrent edit conflicts', async () => {
    // Both users add waypoint at same index simultaneously
    const op1 = {
      type: 'add_waypoint',
      index: 2,
      waypoint: { id: 'wp-1', name: 'Stop 1' }
    };

    const op2 = {
      type: 'add_waypoint',
      index: 2,
      waypoint: { id: 'wp-2', name: 'Stop 2' }
    };

    // Send operations concurrently
    await Promise.all([
      (window as any).sendCollaborativeOperation(op1),
      (window as any).sendCollaborativeOperation(op2)
    ]);

    // Verify both waypoints exist (transformed indices)
    await waitFor(() => {
      expect(screen.getByText(/stop 1/i)).toBeInTheDocument();
      expect(screen.getByText(/stop 2/i)).toBeInTheDocument();
    });
  });
});
```

### 10.3 E2E Tests (Playwright)

```typescript
// e2e/trip-planning-enhanced.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Enhanced Trip Planning', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to trip planner
    await page.goto('http://localhost:8080/wheels?tab=trip-planner');
  });

  test('GPX import creates new trip', async ({ page }) => {
    // Click import button
    await page.click('text=Import GPX');

    // Upload GPX file
    await page.setInputFiles('input[type="file"]', './test-data/sample-trip.gpx');

    // Wait for import to complete
    await expect(page.locator('text=Trip imported successfully')).toBeVisible({ timeout: 10000 });

    // Verify trip appears in list
    await expect(page.locator('text=California Coastal Drive')).toBeVisible();
  });

  test('Collaborative editing shows other users', async ({ browser }) => {
    // Open two browser contexts (two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both users login and open same trip
    await page1.goto('http://localhost:8080/wheels/trip/test-trip-1');
    await page2.goto('http://localhost:8080/wheels/trip/test-trip-1');

    // Verify both users see each other in collaborators list
    await expect(page1.locator('text=2 Active Users')).toBeVisible();
    await expect(page2.locator('text=2 Active Users')).toBeVisible();

    // User 1 adds a waypoint
    await page1.click('button:has-text("Add Waypoint")');
    await page1.fill('input[name="waypoint-name"]', 'Scenic Overlook');
    await page1.click('button:has-text("Save")');

    // User 2 sees the new waypoint appear
    await expect(page2.locator('text=Scenic Overlook')).toBeVisible({ timeout: 3000 });

    await context1.close();
    await context2.close();
  });

  test('Offline mode queues changes', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Make changes while offline
    await page.click('button:has-text("Add Waypoint")');
    await page.fill('input[name="waypoint-name"]', 'Offline Stop');
    await page.click('button:has-text("Save")');

    // Verify offline indicator
    await expect(page.locator('text=Offline')).toBeVisible();
    await expect(page.locator('text=1 pending change')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Verify changes sync
    await expect(page.locator('text=Changes synced')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=0 pending changes')).toBeVisible();
  });
});
```

### 10.4 Performance Tests

```python
# backend/tests/performance/test_gpx_import_performance.py
import pytest
import time
from app.services.trip.gpx_processor import GPXProcessor

@pytest.mark.performance
async def test_gpx_import_large_file():
    """Test GPX import performance with large file (5MB, 5000 waypoints)"""
    processor = GPXProcessor(user_id="test-user")

    # Generate large GPX file
    large_gpx = generate_large_gpx(waypoints=5000, file_size_mb=5)

    start_time = time.time()
    result = await processor.import_gpx(
        file_content=large_gpx,
        filename="large.gpx"
    )
    elapsed = time.time() - start_time

    # Assert performance target (<10s for large files)
    assert elapsed < 10.0, f"Import took {elapsed:.2f}s, expected <10s"
    assert result["waypoints_count"] == 5000

@pytest.mark.performance
async def test_route_version_save_performance():
    """Test route version save performance"""
    from app.services.trip.route_versioning import RouteVersionControl

    controller = RouteVersionControl(user_id="test-user")

    # Create route data with 500 waypoints
    route_data = {
        "waypoints": [
            {"id": f"wp-{i}", "latitude": 37.0 + i * 0.01, "longitude": -122.0 + i * 0.01}
            for i in range(500)
        ]
    }

    start_time = time.time()
    version_id = await controller.save_version(
        trip_id="test-trip",
        route_data=route_data,
        change_description="Performance test"
    )
    elapsed = time.time() - start_time

    # Assert performance target (<1s)
    assert elapsed < 1.0, f"Save took {elapsed:.2f}s, expected <1s"
    assert version_id is not None
```

---

## 11. Deployment Plan

### 11.1 Deployment Phases

**Phase 1: Staging Deployment (Week 1)**
```bash
# Deploy to staging environment
git checkout staging
git pull origin staging

# Run migrations
cd backend
alembic upgrade head

# Deploy backend to Render (staging)
# Automatically triggered by push to staging branch

# Deploy frontend to Netlify (staging)
npm run build
# Automatically deployed to staging.wheelsandwins.com
```

**Phase 2: Beta Testing (Weeks 2-3)**
- Enable feature flags for 10% of users
- Monitor metrics, error rates, performance
- Collect user feedback
- Fix critical bugs

**Phase 3: Gradual Rollout (Week 4)**
```typescript
// Feature flag configuration
const FEATURE_FLAGS = {
  gpx_import_export: {
    enabled: true,
    rollout_percentage: 50, // Start at 50%
    user_whitelist: ['beta-tester-1', 'beta-tester-2']
  },
  collaborative_editing: {
    enabled: true,
    rollout_percentage: 25, // More cautious rollout
    user_whitelist: []
  },
  offline_maps: {
    enabled: false, // Not ready yet
    rollout_percentage: 0
  }
};

// Check if feature enabled for user
function isFeatureEnabled(featureKey: string, userId: string): boolean {
  const flag = FEATURE_FLAGS[featureKey];
  if (!flag.enabled) return false;

  // Check whitelist first
  if (flag.user_whitelist.includes(userId)) return true;

  // Check rollout percentage
  const userHash = hashUserId(userId);
  return (userHash % 100) < flag.rollout_percentage;
}
```

**Phase 4: Production Deployment (Week 5)**
- Increase rollout to 100%
- Monitor stability for 48 hours
- Remove feature flags if stable

### 11.2 Rollback Plan

```bash
# If critical issues discovered, rollback immediately

# Backend rollback
cd backend
git revert HEAD
git push origin main
# Render auto-deploys reverted version

# Frontend rollback
git revert HEAD
git push origin main
# Netlify auto-deploys reverted version

# Database rollback (if migrations applied)
cd backend
alembic downgrade -1  # Rollback one migration
```

### 11.3 Health Checks

```python
# backend/app/api/health.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/health/features")
async def feature_health_check():
    """Check health of new features"""
    checks = {
        "gpx_processor": await check_gpx_processor(),
        "collaborative_editor": await check_collaborative_editor(),
        "offline_maps": await check_offline_maps(),
        "equipment_manager": await check_equipment_manager()
    }

    all_healthy = all(check["status"] == "healthy" for check in checks.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }

async def check_gpx_processor():
    """Verify GPX processing is functional"""
    try:
        processor = GPXProcessor(user_id="health-check")
        # Test with minimal GPX
        test_gpx = """<?xml version="1.0"?>
<gpx version="1.1"><wpt lat="0" lon="0"></wpt></gpx>"""

        result = await processor.import_gpx(
            file_content=test_gpx.encode('utf-8'),
            filename="test.gpx"
        )

        return {"status": "healthy", "message": "GPX processor operational"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

async def check_collaborative_editor():
    """Verify WebSocket collaboration is functional"""
    try:
        # Check WebSocket server is running
        # (Implementation depends on WebSocket setup)
        return {"status": "healthy", "message": "Collaborative editor operational"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

---

## 12. Monitoring & Observability

### 12.1 Key Metrics to Track

**System Metrics:**
- API response times (p50, p95, p99)
- WebSocket connection stability
- Database query performance
- Cache hit rates
- Error rates by endpoint

**Feature Metrics:**
- GPX import success rate
- GPX import processing time
- Collaborative editing active sessions
- Offline map download success rate
- Equipment maintenance reminders sent
- Checklist completion rates

**Business Metrics:**
- Feature adoption rate (% users using new features)
- User engagement (DAU, WAU, MAU)
- Feature retention (users returning to use features)

### 12.2 Logging Strategy

```python
# backend/app/utils/logging.py
import logging
import json
from datetime import datetime

class StructuredLogger:
    """Structured JSON logging for easy parsing"""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def info(self, message: str, **context):
        self.logger.info(json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "level": "INFO",
            "message": message,
            **context
        }))

    def error(self, message: str, error: Exception = None, **context):
        error_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": "ERROR",
            "message": message,
            **context
        }

        if error:
            error_data["error"] = {
                "type": type(error).__name__,
                "message": str(error),
                "stack_trace": traceback.format_exc()
            }

        self.logger.error(json.dumps(error_data))

# Usage
logger = StructuredLogger("gpx_processor")
logger.info(
    "GPX import started",
    user_id="user-123",
    filename="trip.gpx",
    file_size_bytes=5242880
)
```

### 12.3 Alerting Rules

```yaml
# alerts.yml
alerts:
  - name: gpx_import_failure_rate
    condition: gpx_import_errors / gpx_import_total > 0.05
    threshold: 5%
    severity: warning
    message: "GPX import failure rate exceeded 5%"
    channels: [slack, email]

  - name: collaborative_websocket_disconnections
    condition: websocket_disconnections / websocket_connections > 0.10
    threshold: 10%
    severity: critical
    message: "High WebSocket disconnection rate detected"
    channels: [pagerduty, slack]

  - name: offline_map_download_failures
    condition: map_download_failures / map_download_total > 0.10
    threshold: 10%
    severity: warning
    message: "Offline map downloads failing at high rate"
    channels: [slack]

  - name: database_slow_queries
    condition: db_query_p95_time > 1000
    threshold: 1000ms
    severity: warning
    message: "Database queries slow (p95 > 1s)"
    channels: [slack]
```

### 12.4 Observability Dashboard

```typescript
// Admin dashboard: /admin/observability/enhanced-features

interface FeatureMetrics {
  feature_name: string;
  adoption_rate: number;
  success_rate: number;
  avg_response_time_ms: number;
  error_count: number;
  active_users_24h: number;
}

const EnhancedFeaturesObservability: React.FC = () => {
  const { data: metrics } = useQuery<FeatureMetrics[]>({
    queryKey: ['enhanced-features-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/v1/observability/enhanced-features');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30s
  });

  return (
    <div className="space-y-6">
      <h2>Enhanced Features Observability</h2>

      <div className="grid grid-cols-3 gap-4">
        {metrics?.map(metric => (
          <MetricCard
            key={metric.feature_name}
            title={metric.feature_name}
            adoption={`${metric.adoption_rate}%`}
            successRate={`${metric.success_rate}%`}
            avgResponseTime={`${metric.avg_response_time_ms}ms`}
            errorCount={metric.error_count}
            activeUsers={metric.active_users_24h}
          />
        ))}
      </div>

      {/* Real-time error log */}
      <ErrorLogStream feature="all" />

      {/* Performance charts */}
      <PerformanceCharts
        features={['gpx_import', 'collaborative_editing', 'offline_maps']}
      />
    </div>
  );
};
```

---

## Next Steps

1. **Review this technical specification** with team
2. **Create GitHub issues** for each module (GPX, Versioning, Collaborative, Equipment, etc.)
3. **Assign owners** to each module
4. **Begin Phase 1 (Week 1-2)** from INTEGRATION_PLAN.md:
   - Database schema extensions
   - GPX processor implementation
   - Route versioning backend
5. **Set up monitoring** before deployment
6. **Create beta testing group** (10-20 users)

---

**Document Status:** ✅ Complete
**Last Updated:** January 2025
**Version:** 1.0
**Related Documents:**
- INTEGRATION_PLAN.md (8-week implementation roadmap)
- CODEBASE_ANALYSIS.md (current system analysis)
- DATABASE_SCHEMA_REFERENCE.md (database source of truth)

---

**This technical specification provides the complete blueprint for implementing enhanced trip planning features on the Wheels & Wins platform, ensuring zero breaking changes and production-grade quality.**
