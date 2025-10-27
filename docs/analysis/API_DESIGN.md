# API Design: Enhanced Planning System

**Version:** 1.0
**Date:** January 2025
**Status:** Design Approved
**Related Documents:** TECHNICAL_SPEC.md, INTEGRATION_PLAN.md

---

## Executive Summary

This document specifies all new API endpoints required for the enhanced trip planning features. All endpoints follow RESTful conventions, include comprehensive error handling, and are backward-compatible with existing systems.

**API Base URL:**
- **Production:** `https://pam-backend.onrender.com/api/v1`
- **Staging:** `https://wheels-wins-backend-staging.onrender.com/api/v1`

**Authentication:** All endpoints require JWT Bearer token (except public community features)

**Response Format:** JSON (application/json)

**Error Format:** Standardized error responses across all endpoints

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [GPX Import/Export](#2-gpx-importexport)
3. [Route Versioning](#3-route-versioning)
4. [Collaborative Editing](#4-collaborative-editing)
5. [Equipment Management](#5-equipment-management)
6. [Vehicle Readiness](#6-vehicle-readiness)
7. [Offline Maps](#7-offline-maps)
8. [Community Features](#8-community-features)
9. [Error Handling](#9-error-handling)
10. [Rate Limiting](#10-rate-limiting)
11. [Pagination](#11-pagination)
12. [Webhooks](#12-webhooks)

---

## 1. Authentication & Authorization

All endpoints use JWT Bearer token authentication inherited from existing system:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Permission Levels:**
- `owner` - Full access to resource
- `editor` - Can modify but not delete
- `viewer` - Read-only access

**Header Requirements:**
```http
Content-Type: application/json
Authorization: Bearer <token>
User-Agent: WheelsAndWins/1.0.0
```

---

## 2. GPX Import/Export

### 2.1 Import GPX File

**Endpoint:** `POST /trips/import-gpx`

**Description:** Import a GPX file and create a new trip with full route preservation

**Request:**
```http
POST /api/v1/trips/import-gpx
Content-Type: multipart/form-data
Authorization: Bearer <token>

---boundary---
Content-Disposition: form-data; name="file"; filename="california-trip.gpx"
Content-Type: application/gpx+xml

<?xml version="1.0"?>
<gpx version="1.1" creator="Garmin">
  <wpt lat="37.7749" lon="-122.4194">
    <name>San Francisco</name>
    <ele>16</ele>
  </wpt>
  ...
</gpx>
---boundary---
Content-Disposition: form-data; name="trip_name"

California Coastal Drive
---boundary---
Content-Disposition: form-data; name="make_public"

false
---boundary---
```

**Request Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | Yes | GPX file (max 10MB) |
| `trip_name` | string | No | Custom trip name (defaults to GPX metadata name) |
| `make_public` | boolean | No | Share in community (default: false) |
| `merge_with_trip_id` | string (UUID) | No | Merge waypoints into existing trip |

**Response: 200 OK**
```json
{
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "waypoints_count": 15,
  "routes_count": 1,
  "tracks_count": 2,
  "total_distance_km": 1420.5,
  "elevation_gain_m": 3500,
  "elevation_loss_m": 3200,
  "estimated_duration_hours": 18.5,
  "warnings": [
    "Timestamps missing for 3 waypoints",
    "Elevation data interpolated for 2 waypoints"
  ],
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Response: 400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_GPX_FORMAT",
    "message": "GPX file is malformed or invalid",
    "details": {
      "line": 42,
      "column": 15,
      "issue": "Missing closing tag for <wpt>"
    }
  }
}
```

**Response: 413 Payload Too Large**
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "GPX file exceeds maximum size of 10MB",
    "details": {
      "file_size_bytes": 15728640,
      "max_size_bytes": 10485760
    }
  }
}
```

**Response: 422 Unprocessable Entity**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "GPX file contains invalid coordinates",
    "details": {
      "waypoint": "Los Angeles",
      "latitude": 91.5,
      "issue": "Latitude must be between -90 and 90"
    }
  }
}
```

---

### 2.2 Export Trip to GPX

**Endpoint:** `GET /trips/{trip_id}/export-gpx`

**Description:** Export a trip to GPX format with optional filtering

**Request:**
```http
GET /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/export-gpx?include_waypoints=true&include_elevation=true&include_timestamps=true
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_waypoints` | boolean | true | Include waypoint markers |
| `include_routes` | boolean | true | Include route geometry |
| `include_tracks` | boolean | false | Include track history (if available) |
| `include_elevation` | boolean | true | Include elevation data |
| `include_timestamps` | boolean | true | Include timestamps |
| `format_version` | string | "1.1" | GPX format version ("1.0" or "1.1") |

**Response: 200 OK**
```http
Content-Type: application/gpx+xml
Content-Disposition: attachment; filename="california-coastal-drive.gpx"
X-Trip-ID: f47ac10b-58cc-4372-a567-0e02b2c3d479
X-Waypoints-Count: 15
X-Total-Distance-KM: 1420.5

<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wheels & Wins" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>California Coastal Drive</name>
    <desc>15 stops along the California coast</desc>
    <author>
      <name>Wheels & Wins User</name>
    </author>
    <time>2025-01-15T10:30:00Z</time>
  </metadata>
  <wpt lat="37.7749" lon="-122.4194">
    <ele>16</ele>
    <time>2025-01-20T09:00:00Z</time>
    <name>San Francisco</name>
    <desc>Starting point</desc>
  </wpt>
  ...
</gpx>
```

**Response: 404 Not Found**
```json
{
  "error": {
    "code": "TRIP_NOT_FOUND",
    "message": "Trip with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found"
  }
}
```

**Response: 403 Forbidden**
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to export this trip",
    "details": {
      "required_permission": "trip:view",
      "your_role": null
    }
  }
}
```

---

### 2.3 Validate GPX File (Pre-Upload)

**Endpoint:** `POST /trips/validate-gpx`

**Description:** Validate GPX file before importing (useful for client-side validation)

**Request:**
```http
POST /api/v1/trips/validate-gpx
Content-Type: multipart/form-data
Authorization: Bearer <token>

[GPX file data]
```

**Response: 200 OK**
```json
{
  "valid": true,
  "metadata": {
    "waypoints_count": 15,
    "routes_count": 1,
    "tracks_count": 0,
    "has_elevation": true,
    "has_timestamps": true,
    "format_version": "1.1",
    "creator": "Garmin"
  },
  "warnings": [
    "3 waypoints missing timestamps",
    "Elevation data sparse (interpolation recommended)"
  ],
  "errors": []
}
```

**Response: 200 OK (Invalid GPX)**
```json
{
  "valid": false,
  "metadata": null,
  "warnings": [],
  "errors": [
    {
      "code": "INVALID_XML",
      "message": "GPX file is not valid XML",
      "line": 42,
      "column": 15
    },
    {
      "code": "MISSING_REQUIRED_ELEMENT",
      "message": "GPX root element missing required xmlns attribute"
    }
  ]
}
```

---

## 3. Route Versioning

### 3.1 Save Route Version

**Endpoint:** `POST /trips/{trip_id}/versions`

**Description:** Save current route state as a new version

**Request:**
```http
POST /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/versions
Content-Type: application/json
Authorization: Bearer <token>

{
  "change_description": "Added scenic overlook stop near Big Sur",
  "auto_save": false,
  "create_branch": false,
  "branch_name": null
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `change_description` | string | Yes | Human-readable description of changes (max 500 chars) |
| `auto_save` | boolean | No | Whether this is an automatic save (default: false) |
| `create_branch` | boolean | No | Create a new branch from this version (default: false) |
| `branch_name` | string | No | Name for new branch (required if create_branch=true) |

**Response: 201 Created**
```json
{
  "version_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "version_number": 12,
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "change_description": "Added scenic overlook stop near Big Sur",
  "parent_version_id": "8a2cdb3c-2b6c-3aac-8acc-1a0c6b2cab5c",
  "created_by": "user-123",
  "created_at": "2025-01-15T14:22:00Z",
  "snapshot": {
    "waypoints_count": 16,
    "total_distance_km": 1435.2,
    "elevation_gain_m": 3650
  },
  "diff": {
    "waypoints_added": 1,
    "waypoints_removed": 0,
    "waypoints_modified": 0,
    "distance_change_km": 14.7,
    "duration_change_hours": 0.5
  }
}
```

**Response: 429 Too Many Requests**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many versions created in short period",
    "details": {
      "limit": 10,
      "window": "5 minutes",
      "retry_after": 120
    }
  }
}
```

---

### 3.2 Get Version History

**Endpoint:** `GET /trips/{trip_id}/versions`

**Description:** Retrieve version history for a trip

**Request:**
```http
GET /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/versions?limit=20&offset=0&include_auto_save=false
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Max versions to return (1-100) |
| `offset` | integer | 0 | Pagination offset |
| `include_auto_save` | boolean | false | Include auto-saved versions |
| `branch` | string | null | Filter by branch name |

**Response: 200 OK**
```json
{
  "versions": [
    {
      "version_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "version_number": 12,
      "change_description": "Added scenic overlook stop near Big Sur",
      "created_by": "user-123",
      "created_by_name": "John Doe",
      "created_at": "2025-01-15T14:22:00Z",
      "is_current": true,
      "is_auto_save": false,
      "branch": null,
      "snapshot": {
        "waypoints_count": 16,
        "total_distance_km": 1435.2
      }
    },
    {
      "version_id": "8a2cdb3c-2b6c-3aac-8acc-1a0c6b2cab5c",
      "version_number": 11,
      "change_description": "Removed detour through Monterey",
      "created_by": "user-123",
      "created_by_name": "John Doe",
      "created_at": "2025-01-15T12:10:00Z",
      "is_current": false,
      "is_auto_save": false,
      "branch": null,
      "snapshot": {
        "waypoints_count": 15,
        "total_distance_km": 1420.5
      }
    }
  ],
  "total": 12,
  "current_version": 12,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

---

### 3.3 Restore Version

**Endpoint:** `POST /trips/{trip_id}/versions/{version_id}/restore`

**Description:** Restore trip to a previous version (creates new version)

**Request:**
```http
POST /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/versions/8a2cdb3c-2b6c-3aac-8acc-1a0c6b2cab5c/restore
Content-Type: application/json
Authorization: Bearer <token>

{
  "create_new_version": true,
  "change_description": "Reverted to version 11 - detour through Monterey was better"
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `create_new_version` | boolean | No | Create new version vs direct overwrite (default: true) |
| `change_description` | string | No | Custom description (auto-generated if not provided) |

**Response: 200 OK**
```json
{
  "restored": true,
  "restored_from_version": 11,
  "new_version_id": "7b0cda2b-1a5b-2a9b-7a9b-0a0b5a1ba4a",
  "new_version_number": 13,
  "message": "Successfully restored to version 11",
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "restored_at": "2025-01-15T15:00:00Z"
}
```

---

### 3.4 Compare Versions

**Endpoint:** `GET /trips/{trip_id}/versions/{version_a_id}/compare/{version_b_id}`

**Description:** Compare two versions and show differences

**Request:**
```http
GET /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/versions/8a2cdb3c-2b6c-3aac-8acc-1a0c6b2cab5c/compare/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "version_a": {
    "version_id": "8a2cdb3c-2b6c-3aac-8acc-1a0c6b2cab5c",
    "version_number": 11,
    "created_at": "2025-01-15T12:10:00Z"
  },
  "version_b": {
    "version_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "version_number": 12,
    "created_at": "2025-01-15T14:22:00Z"
  },
  "diff": {
    "waypoints_added": [
      {
        "id": "wp-scenic-overlook",
        "name": "Big Sur Scenic Overlook",
        "latitude": 36.2704,
        "longitude": -121.8081,
        "order": 8
      }
    ],
    "waypoints_removed": [],
    "waypoints_modified": [],
    "waypoints_reordered": false,
    "settings_changed": {},
    "metrics_change": {
      "distance_change_km": 14.7,
      "duration_change_hours": 0.5,
      "elevation_gain_change_m": 150
    }
  },
  "summary": "1 waypoint added, 0 removed, 0 modified"
}
```

---

### 3.5 Delete Version

**Endpoint:** `DELETE /trips/{trip_id}/versions/{version_id}`

**Description:** Delete a specific version (cannot delete current version)

**Request:**
```http
DELETE /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/versions/7b0cda2b-1a5b-2a9b-7a9b-0a0b5a1ba4a
Authorization: Bearer <token>
```

**Response: 204 No Content**
```
(Empty body)
```

**Response: 409 Conflict**
```json
{
  "error": {
    "code": "CANNOT_DELETE_CURRENT_VERSION",
    "message": "Cannot delete the currently active version",
    "details": {
      "version_id": "7b0cda2b-1a5b-2a9b-7a9b-0a0b5a1ba4a",
      "is_current": true
    }
  }
}
```

---

## 4. Collaborative Editing

### 4.1 WebSocket Connection

**Endpoint:** `WS /trips/{trip_id}/collaborate`

**Description:** Establish WebSocket connection for real-time collaboration

**Connection URL:**
```
wss://pam-backend.onrender.com/api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/collaborate?token=<jwt>&user_id=<user_id>&user_name=<url_encoded_name>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | JWT authentication token |
| `user_id` | string (UUID) | Yes | Current user's UUID |
| `user_name` | string | Yes | Display name (URL-encoded) |

**Connection Handshake:**
```json
// Server → Client (on connect)
{
  "type": "connected",
  "session_id": "session-abc123",
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "your_user_id": "user-123",
  "connected_at": "2025-01-15T15:30:00Z"
}
```

**Presence Update:**
```json
// Server → All Clients (when user joins/leaves)
{
  "type": "presence",
  "users": [
    {
      "user_id": "user-123",
      "user_name": "John Doe",
      "connected_at": "2025-01-15T15:30:00Z",
      "cursor_position": {
        "waypoint_id": "wp-5",
        "latitude": 36.2704,
        "longitude": -121.8081
      },
      "is_editing": true
    },
    {
      "user_id": "user-456",
      "user_name": "Jane Smith",
      "connected_at": "2025-01-15T15:32:00Z",
      "cursor_position": null,
      "is_editing": false
    }
  ],
  "total_users": 2
}
```

---

### 4.2 Send Operation (WebSocket)

**Message Type:** `operation`

**Description:** Send editing operation to server (broadcast to all clients)

**Client → Server:**
```json
{
  "type": "operation",
  "operation": {
    "op_type": "add_waypoint",
    "waypoint_id": "wp-new-123",
    "index": 5,
    "waypoint": {
      "id": "wp-new-123",
      "name": "Carmel-by-the-Sea",
      "latitude": 36.5552,
      "longitude": -121.9233,
      "elevation": 20,
      "type": "stop",
      "order": 5
    }
  },
  "client_timestamp": "2025-01-15T15:35:00.123Z"
}
```

**Operation Types:**
| Type | Description | Parameters |
|------|-------------|------------|
| `add_waypoint` | Add new waypoint | `index`, `waypoint` |
| `remove_waypoint` | Remove waypoint | `waypoint_id` |
| `move_waypoint` | Reorder waypoint | `waypoint_id`, `from_index`, `to_index` |
| `update_waypoint` | Modify waypoint data | `waypoint_id`, `updates` |
| `update_settings` | Change route settings | `settings` |
| `cursor_move` | Update cursor position | `position` |

**Server → All Clients (except sender):**
```json
{
  "type": "operation",
  "operation": {
    "op_type": "add_waypoint",
    "waypoint_id": "wp-new-123",
    "index": 5,
    "waypoint": {
      "id": "wp-new-123",
      "name": "Carmel-by-the-Sea",
      "latitude": 36.5552,
      "longitude": -121.9233,
      "elevation": 20,
      "type": "stop",
      "order": 5
    }
  },
  "user_id": "user-123",
  "user_name": "John Doe",
  "server_timestamp": "2025-01-15T15:35:00.456Z"
}
```

---

### 4.3 Conflict Resolution (WebSocket)

**Message Type:** `conflict_resolved`

**Description:** Server notifies clients when concurrent edits create conflict

**Server → All Clients:**
```json
{
  "type": "conflict_resolved",
  "conflict_id": "conflict-789",
  "operations": [
    {
      "user_id": "user-123",
      "operation": {
        "op_type": "add_waypoint",
        "index": 5,
        "waypoint": {...}
      },
      "original_index": 5,
      "transformed_index": 5
    },
    {
      "user_id": "user-456",
      "operation": {
        "op_type": "add_waypoint",
        "index": 5,
        "waypoint": {...}
      },
      "original_index": 5,
      "transformed_index": 6
    }
  ],
  "resolution_strategy": "operational_transform",
  "resolved_at": "2025-01-15T15:36:00.789Z"
}
```

---

### 4.4 Get Collaborators (REST)

**Endpoint:** `GET /trips/{trip_id}/collaborators`

**Description:** Get list of users with access to trip

**Request:**
```http
GET /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/collaborators
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "collaborators": [
    {
      "user_id": "user-123",
      "user_name": "John Doe",
      "email": "john@example.com",
      "role": "owner",
      "permission": "edit",
      "added_at": "2025-01-10T10:00:00Z",
      "added_by": null,
      "is_online": true,
      "last_active": "2025-01-15T15:30:00Z"
    },
    {
      "user_id": "user-456",
      "user_name": "Jane Smith",
      "email": "jane@example.com",
      "role": "editor",
      "permission": "edit",
      "added_at": "2025-01-12T14:00:00Z",
      "added_by": "user-123",
      "is_online": false,
      "last_active": "2025-01-14T18:00:00Z"
    }
  ],
  "total": 2,
  "online_count": 1
}
```

---

### 4.5 Invite Collaborator

**Endpoint:** `POST /trips/{trip_id}/collaborators`

**Description:** Invite user to collaborate on trip

**Request:**
```http
POST /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/collaborators
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "friend@example.com",
  "permission": "edit",
  "message": "Check out our California trip plan!",
  "send_email_notification": true
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email of user to invite |
| `permission` | string | Yes | "view" or "edit" |
| `message` | string | No | Personal message (max 500 chars) |
| `send_email_notification` | boolean | No | Send email invitation (default: true) |

**Response: 201 Created**
```json
{
  "invitation_id": "inv-abc123",
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "invitee_email": "friend@example.com",
  "invitee_user_id": "user-789",
  "permission": "edit",
  "invited_at": "2025-01-15T16:00:00Z",
  "invited_by": "user-123",
  "status": "pending",
  "expires_at": "2025-01-22T16:00:00Z",
  "email_sent": true
}
```

**Response: 409 Conflict**
```json
{
  "error": {
    "code": "USER_ALREADY_COLLABORATOR",
    "message": "User is already a collaborator on this trip",
    "details": {
      "user_id": "user-789",
      "existing_permission": "view"
    }
  }
}
```

---

### 4.6 Remove Collaborator

**Endpoint:** `DELETE /trips/{trip_id}/collaborators/{user_id}`

**Description:** Remove user's access to trip

**Request:**
```http
DELETE /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/collaborators/user-456
Authorization: Bearer <token>
```

**Response: 204 No Content**
```
(Empty body)
```

**Response: 403 Forbidden**
```json
{
  "error": {
    "code": "CANNOT_REMOVE_OWNER",
    "message": "Cannot remove trip owner from collaborators"
  }
}
```

---

## 5. Equipment Management

### 5.1 List Equipment

**Endpoint:** `GET /equipment`

**Description:** Get user's equipment inventory with filtering

**Request:**
```http
GET /api/v1/equipment?category=Power%20%26%20Electronics&status=owned&needs_maintenance=true&limit=50&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | null | Filter by category |
| `status` | string | null | Filter by status (owned, needed, rented, retired) |
| `condition` | string | null | Filter by condition (excellent, good, fair, poor) |
| `needs_maintenance` | boolean | null | Filter items needing maintenance |
| `storage_location` | string | null | Filter by storage location |
| `limit` | integer | 50 | Max items to return (1-100) |
| `offset` | integer | 0 | Pagination offset |
| `sort` | string | "name" | Sort field (name, purchase_date, next_service_date) |
| `order` | string | "asc" | Sort order (asc, desc) |

**Response: 200 OK**
```json
{
  "equipment": [
    {
      "id": "eq-123",
      "name": "Portable Solar Panel",
      "category": "Power & Electronics",
      "status": "owned",
      "condition": "excellent",
      "storage_location": "Garage, Shelf 3",
      "vehicle_location": null,
      "last_service_date": "2024-06-15",
      "next_service_date": "2025-06-15",
      "maintenance_due_in_days": 151,
      "maintenance_overdue": false,
      "purchase_date": "2024-06-01",
      "purchase_price": 299.99,
      "warranty_expiration": "2026-06-01",
      "photos": [
        "https://storage.example.com/eq-123-1.jpg",
        "https://storage.example.com/eq-123-2.jpg"
      ],
      "manual_url": "https://manuals.example.com/solar-panel-manual.pdf",
      "serial_number": "SP123456",
      "created_at": "2024-06-01T10:00:00Z",
      "updated_at": "2025-01-10T14:00:00Z"
    }
  ],
  "total": 45,
  "summary": {
    "total_items": 45,
    "by_status": {
      "owned": 40,
      "needed": 3,
      "rented": 2,
      "retired": 0
    },
    "by_condition": {
      "excellent": 15,
      "good": 25,
      "fair": 4,
      "poor": 1
    },
    "needs_maintenance_count": 3,
    "overdue_maintenance_count": 1
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

---

### 5.2 Create Equipment

**Endpoint:** `POST /equipment`

**Description:** Add new equipment item to inventory

**Request:**
```http
POST /api/v1/equipment
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Portable Propane Grill",
  "category": "Cooking & Kitchen",
  "status": "owned",
  "condition": "excellent",
  "storage_location": "RV Storage Compartment 4",
  "purchase_date": "2025-01-10",
  "purchase_price": 149.99,
  "maintenance_interval_days": 180,
  "notes": "Requires propane tank check before each trip"
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Equipment name (max 200 chars) |
| `category` | string | Yes | Category name |
| `status` | string | No | "owned", "needed", "rented", "retired" (default: "owned") |
| `condition` | string | No | "excellent", "good", "fair", "poor" (default: "good") |
| `storage_location` | string | No | Where item is stored |
| `vehicle_location` | string | No | Location in RV/vehicle |
| `purchase_date` | string (ISO date) | No | Purchase date |
| `purchase_price` | number | No | Purchase price in USD |
| `warranty_expiration` | string (ISO date) | No | Warranty end date |
| `maintenance_interval_days` | integer | No | Days between maintenance (default: 365) |
| `notes` | string | No | Additional notes (max 1000 chars) |
| `photos` | string[] | No | Array of photo URLs |
| `manual_url` | string | No | Link to manual/documentation |
| `serial_number` | string | No | Serial number |

**Response: 201 Created**
```json
{
  "id": "eq-456",
  "name": "Portable Propane Grill",
  "category": "Cooking & Kitchen",
  "status": "owned",
  "condition": "excellent",
  "storage_location": "RV Storage Compartment 4",
  "vehicle_location": null,
  "last_service_date": null,
  "next_service_date": "2025-07-09",
  "maintenance_interval_days": 180,
  "purchase_date": "2025-01-10",
  "purchase_price": 149.99,
  "warranty_expiration": null,
  "photos": [],
  "manual_url": null,
  "serial_number": null,
  "notes": "Requires propane tank check before each trip",
  "created_at": "2025-01-15T16:30:00Z",
  "updated_at": "2025-01-15T16:30:00Z"
}
```

---

### 5.3 Update Equipment

**Endpoint:** `PATCH /equipment/{equipment_id}`

**Description:** Update equipment item (partial update)

**Request:**
```http
PATCH /api/v1/equipment/eq-456
Content-Type: application/json
Authorization: Bearer <token>

{
  "condition": "good",
  "storage_location": "Garage, Shelf 2",
  "notes": "Requires propane tank check before each trip. Cleaned on 2025-01-15."
}
```

**Response: 200 OK**
```json
{
  "id": "eq-456",
  "name": "Portable Propane Grill",
  "condition": "good",
  "storage_location": "Garage, Shelf 2",
  "notes": "Requires propane tank check before each trip. Cleaned on 2025-01-15.",
  "updated_at": "2025-01-15T17:00:00Z"
}
```

---

### 5.4 Log Maintenance

**Endpoint:** `POST /equipment/{equipment_id}/maintenance`

**Description:** Log maintenance performed on equipment

**Request:**
```http
POST /api/v1/equipment/eq-456/maintenance
Content-Type: application/json
Authorization: Bearer <token>

{
  "service_type": "inspection",
  "description": "Annual inspection and cleaning",
  "service_date": "2025-01-15",
  "cost": 0,
  "performed_by": "Self",
  "next_service_interval_days": 180,
  "notes": "Grill cleaned, burners inspected, hose connections checked. All OK."
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service_type` | string | Yes | "inspection", "repair", "replacement", "cleaning" |
| `description` | string | Yes | Service description (max 500 chars) |
| `service_date` | string (ISO date) | No | Date performed (default: today) |
| `cost` | number | No | Service cost in USD (default: 0) |
| `performed_by` | string | No | Who performed service (default: "Self") |
| `next_service_interval_days` | integer | No | Override interval for next service |
| `notes` | string | No | Additional notes (max 1000 chars) |
| `photos` | string[] | No | Photos of completed work |

**Response: 201 Created**
```json
{
  "id": "maint-789",
  "equipment_id": "eq-456",
  "service_type": "inspection",
  "description": "Annual inspection and cleaning",
  "service_date": "2025-01-15",
  "cost": 0,
  "performed_by": "Self",
  "next_service_date": "2025-07-14",
  "notes": "Grill cleaned, burners inspected, hose connections checked. All OK.",
  "photos": [],
  "created_at": "2025-01-15T17:15:00Z",
  "equipment_updated": {
    "last_service_date": "2025-01-15",
    "next_service_date": "2025-07-14"
  }
}
```

---

### 5.5 Get Maintenance History

**Endpoint:** `GET /equipment/{equipment_id}/maintenance`

**Description:** Get maintenance history for equipment item

**Request:**
```http
GET /api/v1/equipment/eq-456/maintenance?limit=10&offset=0
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "equipment_id": "eq-456",
  "equipment_name": "Portable Propane Grill",
  "maintenance_history": [
    {
      "id": "maint-789",
      "service_type": "inspection",
      "description": "Annual inspection and cleaning",
      "service_date": "2025-01-15",
      "cost": 0,
      "performed_by": "Self",
      "notes": "Grill cleaned, burners inspected, hose connections checked. All OK.",
      "created_at": "2025-01-15T17:15:00Z"
    },
    {
      "id": "maint-456",
      "service_type": "repair",
      "description": "Replaced igniter",
      "service_date": "2024-08-20",
      "cost": 15.99,
      "performed_by": "Self",
      "notes": "Igniter was corroded, replaced with new part.",
      "created_at": "2024-08-20T14:00:00Z"
    }
  ],
  "total": 2,
  "total_cost": 15.99,
  "next_service_due": "2025-07-14"
}
```

---

### 5.6 Bulk Import Equipment

**Endpoint:** `POST /equipment/bulk-import`

**Description:** Import multiple equipment items from CSV/spreadsheet

**Request:**
```http
POST /api/v1/equipment/bulk-import
Content-Type: multipart/form-data
Authorization: Bearer <token>

---boundary---
Content-Disposition: form-data; name="file"; filename="equipment.csv"
Content-Type: text/csv

name,category,status,condition,storage_location,purchase_price
Portable Solar Panel,Power & Electronics,owned,excellent,Garage Shelf 3,299.99
LED Lantern,Lighting,owned,good,RV Compartment 2,29.99
Water Filter,Water & Sanitation,owned,excellent,RV Kitchen,79.99
---boundary---
```

**Response: 200 OK**
```json
{
  "imported": 3,
  "failed": 0,
  "items": [
    {
      "id": "eq-auto-1",
      "name": "Portable Solar Panel",
      "status": "created"
    },
    {
      "id": "eq-auto-2",
      "name": "LED Lantern",
      "status": "created"
    },
    {
      "id": "eq-auto-3",
      "name": "Water Filter",
      "status": "created"
    }
  ],
  "errors": []
}
```

---

## 6. Vehicle Readiness

### 6.1 Create Checklist

**Endpoint:** `POST /checklists`

**Description:** Create pre-trip readiness checklist

**Request:**
```http
POST /api/v1/checklists
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "California Trip Readiness",
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "template_id": null,
  "auto_generate": true,
  "include_equipment": true,
  "include_vehicle": true,
  "include_rv_specific": true
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Checklist name (max 200 chars) |
| `trip_id` | string (UUID) | No | Link to specific trip |
| `template_id` | string (UUID) | No | Use existing template |
| `auto_generate` | boolean | No | Auto-generate items based on trip (default: true) |
| `include_equipment` | boolean | No | Include equipment packing items (default: true) |
| `include_vehicle` | boolean | No | Include vehicle maintenance items (default: true) |
| `include_rv_specific` | boolean | No | Include RV-specific items (default: false) |

**Response: 201 Created**
```json
{
  "id": "checklist-abc",
  "name": "California Trip Readiness",
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "is_template": false,
  "template_id": null,
  "items": [
    {
      "id": "item-1",
      "category": "Vehicle Maintenance",
      "task": "Check vehicle fluids (oil, coolant, windshield washer)",
      "description": "Ensure all fluids are at proper levels",
      "priority": "critical",
      "order": 1,
      "completed": false,
      "completed_at": null,
      "completed_by": null,
      "equipment_item_id": null,
      "notes": null
    },
    {
      "id": "item-2",
      "category": "Vehicle Maintenance",
      "task": "Verify tire pressure and spare tire",
      "description": "Check all tires including spare for proper pressure",
      "priority": "critical",
      "order": 2,
      "completed": false,
      "completed_at": null,
      "completed_by": null,
      "equipment_item_id": null,
      "notes": null
    },
    {
      "id": "item-3",
      "category": "Equipment",
      "task": "Pack Portable Solar Panel",
      "description": null,
      "priority": "important",
      "order": 3,
      "completed": false,
      "completed_at": null,
      "completed_by": null,
      "equipment_item_id": "eq-123",
      "notes": null
    }
  ],
  "completed_count": 0,
  "total_count": 15,
  "completion_percentage": 0,
  "created_at": "2025-01-15T18:00:00Z",
  "updated_at": "2025-01-15T18:00:00Z",
  "completed_at": null
}
```

---

### 6.2 Update Checklist Item

**Endpoint:** `PATCH /checklists/{checklist_id}/items/{item_id}`

**Description:** Mark item as complete/incomplete or update details

**Request:**
```http
PATCH /api/v1/checklists/checklist-abc/items/item-1
Content-Type: application/json
Authorization: Bearer <token>

{
  "completed": true,
  "notes": "All fluids checked and topped off. Oil change done on 2025-01-10."
}
```

**Response: 200 OK**
```json
{
  "id": "item-1",
  "category": "Vehicle Maintenance",
  "task": "Check vehicle fluids (oil, coolant, windshield washer)",
  "completed": true,
  "completed_at": "2025-01-15T18:15:00Z",
  "completed_by": "user-123",
  "notes": "All fluids checked and topped off. Oil change done on 2025-01-10.",
  "checklist_updated": {
    "completed_count": 1,
    "total_count": 15,
    "completion_percentage": 6.67
  }
}
```

---

### 6.3 Get Checklist Progress

**Endpoint:** `GET /checklists/{checklist_id}/progress`

**Description:** Get detailed checklist progress

**Request:**
```http
GET /api/v1/checklists/checklist-abc/progress
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "checklist_id": "checklist-abc",
  "name": "California Trip Readiness",
  "overall": {
    "completed_count": 8,
    "total_count": 15,
    "completion_percentage": 53.33,
    "estimated_time_remaining_minutes": 45
  },
  "by_priority": {
    "critical": {
      "completed": 4,
      "total": 5,
      "percentage": 80
    },
    "important": {
      "completed": 3,
      "total": 7,
      "percentage": 42.86
    },
    "optional": {
      "completed": 1,
      "total": 3,
      "percentage": 33.33
    }
  },
  "by_category": {
    "Vehicle Maintenance": {
      "completed": 4,
      "total": 5,
      "percentage": 80
    },
    "Equipment": {
      "completed": 3,
      "total": 8,
      "percentage": 37.5
    },
    "Safety": {
      "completed": 1,
      "total": 2,
      "percentage": 50
    }
  },
  "incomplete_critical_items": [
    {
      "id": "item-5",
      "task": "Pack first aid kit",
      "category": "Safety",
      "priority": "critical"
    }
  ]
}
```

---

## 7. Offline Maps

### 7.1 Request Map Download

**Endpoint:** `POST /offline-maps/download`

**Description:** Queue offline map download for trip route

**Request:**
```http
POST /api/v1/offline-maps/download
Content-Type: application/json
Authorization: Bearer <token>

{
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "zoom_levels": [10, 11, 12, 13],
  "buffer_km": 5,
  "map_style": "streets",
  "priority": "high"
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trip_id` | string (UUID) | Yes | Trip to download maps for |
| `zoom_levels` | integer[] | No | Zoom levels to download (default: [10,11,12,13]) |
| `buffer_km` | integer | No | Buffer around route in km (default: 5) |
| `map_style` | string | No | "streets", "satellite", "outdoors" (default: "streets") |
| `priority` | string | No | "high", "normal", "low" (default: "normal") |

**Response: 202 Accepted**
```json
{
  "download_id": "dl-xyz789",
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "queued",
  "estimated_tiles": 1542,
  "estimated_size_mb": 46.3,
  "estimated_duration_seconds": 120,
  "zoom_levels": [10, 11, 12, 13],
  "buffer_km": 5,
  "map_style": "streets",
  "priority": "high",
  "queued_at": "2025-01-15T19:00:00Z"
}
```

---

### 7.2 Get Download Status

**Endpoint:** `GET /offline-maps/download/{download_id}/status`

**Description:** Check status of map download

**Request:**
```http
GET /api/v1/offline-maps/download/dl-xyz789/status
Authorization: Bearer <token>
```

**Response: 200 OK (Downloading)**
```json
{
  "download_id": "dl-xyz789",
  "status": "downloading",
  "progress_percent": 67.3,
  "tiles_downloaded": 1038,
  "tiles_total": 1542,
  "size_downloaded_mb": 31.2,
  "size_total_mb": 46.3,
  "started_at": "2025-01-15T19:00:15Z",
  "estimated_completion": "2025-01-15T19:01:45Z"
}
```

**Response: 200 OK (Completed)**
```json
{
  "download_id": "dl-xyz789",
  "status": "completed",
  "progress_percent": 100,
  "tiles_downloaded": 1542,
  "tiles_total": 1542,
  "size_downloaded_mb": 46.3,
  "size_total_mb": 46.3,
  "started_at": "2025-01-15T19:00:15Z",
  "completed_at": "2025-01-15T19:02:00Z",
  "duration_seconds": 105,
  "storage_path": "/offline-maps/trip-f47ac10b"
}
```

**Response: 200 OK (Failed)**
```json
{
  "download_id": "dl-xyz789",
  "status": "failed",
  "progress_percent": 45.2,
  "tiles_downloaded": 697,
  "tiles_total": 1542,
  "error": {
    "code": "NETWORK_ERROR",
    "message": "Failed to download map tiles due to network timeout",
    "retryable": true
  },
  "started_at": "2025-01-15T19:00:15Z",
  "failed_at": "2025-01-15T19:01:00Z"
}
```

---

### 7.3 List Downloaded Maps

**Endpoint:** `GET /offline-maps`

**Description:** List all downloaded offline maps for user

**Request:**
```http
GET /api/v1/offline-maps?status=completed&limit=20&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | null | Filter by status (queued, downloading, completed, failed) |
| `trip_id` | string (UUID) | null | Filter by trip |
| `limit` | integer | 20 | Max items to return |
| `offset` | integer | 0 | Pagination offset |

**Response: 200 OK**
```json
{
  "maps": [
    {
      "download_id": "dl-xyz789",
      "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "trip_name": "California Coastal Drive",
      "status": "completed",
      "tiles_count": 1542,
      "size_mb": 46.3,
      "zoom_levels": [10, 11, 12, 13],
      "map_style": "streets",
      "downloaded_at": "2025-01-15T19:02:00Z",
      "expires_at": "2025-02-15T19:02:00Z"
    }
  ],
  "total": 3,
  "total_storage_used_mb": 142.7,
  "storage_limit_mb": 500,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

---

### 7.4 Delete Offline Map

**Endpoint:** `DELETE /offline-maps/{download_id}`

**Description:** Delete downloaded offline map to free storage

**Request:**
```http
DELETE /api/v1/offline-maps/dl-xyz789
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "deleted": true,
  "download_id": "dl-xyz789",
  "freed_storage_mb": 46.3,
  "remaining_storage_mb": 96.4
}
```

---

## 8. Community Features

### 8.1 Share Trip Publicly

**Endpoint:** `POST /trips/{trip_id}/share-public`

**Description:** Share trip in community for others to discover

**Request:**
```http
POST /api/v1/trips/f47ac10b-58cc-4372-a567-0e02b2c3d479/share-public
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Epic California Coast RV Journey",
  "description": "2-week coastal drive from SF to LA with amazing stops",
  "tags": ["coastal", "rv", "california", "scenic"],
  "difficulty": "moderate",
  "duration_days": 14,
  "allow_downloads": true,
  "allow_comments": true
}
```

**Response: 201 Created**
```json
{
  "share_id": "share-abc123",
  "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "public_url": "https://wheelsandwins.com/community/trips/share-abc123",
  "title": "Epic California Coast RV Journey",
  "description": "2-week coastal drive from SF to LA with amazing stops",
  "tags": ["coastal", "rv", "california", "scenic"],
  "difficulty": "moderate",
  "duration_days": 14,
  "views_count": 0,
  "downloads_count": 0,
  "likes_count": 0,
  "shared_at": "2025-01-15T20:00:00Z",
  "shared_by": {
    "user_id": "user-123",
    "user_name": "John Doe"
  }
}
```

---

### 8.2 Search Community Trips

**Endpoint:** `GET /community/trips`

**Description:** Search publicly shared trips

**Request:**
```http
GET /api/v1/community/trips?tags=coastal,rv&difficulty=moderate&min_duration_days=7&max_duration_days=21&sort=popular&limit=20&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | null | Search in title/description |
| `tags` | string (comma-separated) | null | Filter by tags |
| `difficulty` | string | null | "easy", "moderate", "hard" |
| `min_duration_days` | integer | null | Minimum trip duration |
| `max_duration_days` | integer | null | Maximum trip duration |
| `region` | string | null | Geographic region |
| `sort` | string | "popular" | "popular", "recent", "rating" |
| `limit` | integer | 20 | Max items to return |
| `offset` | integer | 0 | Pagination offset |

**Response: 200 OK**
```json
{
  "trips": [
    {
      "share_id": "share-abc123",
      "title": "Epic California Coast RV Journey",
      "description": "2-week coastal drive from SF to LA with amazing stops",
      "thumbnail_url": "https://storage.example.com/trip-thumbs/share-abc123.jpg",
      "tags": ["coastal", "rv", "california", "scenic"],
      "difficulty": "moderate",
      "duration_days": 14,
      "distance_km": 1420.5,
      "waypoints_count": 15,
      "views_count": 245,
      "downloads_count": 32,
      "likes_count": 18,
      "rating_average": 4.7,
      "reviews_count": 5,
      "shared_at": "2025-01-15T20:00:00Z",
      "shared_by": {
        "user_id": "user-123",
        "user_name": "John Doe",
        "avatar_url": "https://storage.example.com/avatars/user-123.jpg"
      }
    }
  ],
  "total": 47,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

### 8.3 Download Shared Trip

**Endpoint:** `POST /community/trips/{share_id}/download`

**Description:** Download/copy shared trip to your account

**Request:**
```http
POST /api/v1/community/trips/share-abc123/download
Content-Type: application/json
Authorization: Bearer <token>

{
  "customizations": {
    "title": "My California Coast Trip (Based on John's)",
    "remove_waypoints": ["wp-5", "wp-12"],
    "add_notes": true
  }
}
```

**Response: 201 Created**
```json
{
  "trip_id": "new-trip-xyz456",
  "original_share_id": "share-abc123",
  "title": "My California Coast Trip (Based on John's)",
  "waypoints_count": 13,
  "total_distance_km": 1320.8,
  "attribution": {
    "original_creator": "John Doe",
    "original_share_id": "share-abc123"
  },
  "created_at": "2025-01-15T20:30:00Z"
}
```

---

### 8.4 Review Shared Trip

**Endpoint:** `POST /community/trips/{share_id}/reviews`

**Description:** Leave review and rating for shared trip

**Request:**
```http
POST /api/v1/community/trips/share-abc123/reviews
Content-Type: application/json
Authorization: Bearer <token>

{
  "rating": 5,
  "title": "Amazing coastal route!",
  "review": "We followed this route last month and it was perfect. Every stop was incredible and the timing was spot on. Highly recommend for RVers!",
  "photos": [
    "https://storage.example.com/reviews/photo1.jpg",
    "https://storage.example.com/reviews/photo2.jpg"
  ],
  "trip_date": "2024-12-15"
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rating` | integer | Yes | Rating 1-5 stars |
| `title` | string | Yes | Review title (max 100 chars) |
| `review` | string | Yes | Review text (max 2000 chars) |
| `photos` | string[] | No | Photo URLs |
| `trip_date` | string (ISO date) | No | When you took the trip |

**Response: 201 Created**
```json
{
  "review_id": "review-def456",
  "share_id": "share-abc123",
  "rating": 5,
  "title": "Amazing coastal route!",
  "review": "We followed this route last month and it was perfect...",
  "photos": [
    "https://storage.example.com/reviews/photo1.jpg",
    "https://storage.example.com/reviews/photo2.jpg"
  ],
  "trip_date": "2024-12-15",
  "reviewer": {
    "user_id": "user-456",
    "user_name": "Jane Smith",
    "avatar_url": "https://storage.example.com/avatars/user-456.jpg"
  },
  "created_at": "2025-01-15T21:00:00Z",
  "helpful_count": 0
}
```

---

## 9. Error Handling

### 9.1 Standard Error Response

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "value",
      "additional_context": "value"
    },
    "timestamp": "2025-01-15T22:00:00Z",
    "request_id": "req-abc123",
    "documentation_url": "https://docs.wheelsandwins.com/api/errors/ERROR_CODE"
  }
}
```

### 9.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request data validation failed |
| `CONFLICT` | 409 | Request conflicts with existing state |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit |
| `INVALID_GPX_FORMAT` | 400 | GPX file is malformed |
| `CANNOT_DELETE_CURRENT_VERSION` | 409 | Cannot delete active version |
| `USER_ALREADY_COLLABORATOR` | 409 | User already has access |
| `NETWORK_ERROR` | 503 | External service unavailable |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

### 9.3 Validation Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "field": "waypoints[2].latitude",
          "value": 91.5,
          "constraint": "Latitude must be between -90 and 90",
          "code": "OUT_OF_RANGE"
        },
        {
          "field": "trip_name",
          "value": "",
          "constraint": "Trip name is required",
          "code": "REQUIRED_FIELD"
        }
      ]
    }
  }
}
```

---

## 10. Rate Limiting

### 10.1 Rate Limit Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642272000
```

### 10.2 Rate Limits by Endpoint Category

| Category | Limit | Window |
|----------|-------|--------|
| GPX Import | 10 requests | 5 minutes |
| GPX Export | 30 requests | 5 minutes |
| Version Save | 20 requests | 5 minutes |
| Collaborative WebSocket | 5 connections | per user |
| Equipment Operations | 100 requests | 1 minute |
| Community Search | 60 requests | 1 minute |
| Map Downloads | 5 concurrent | per user |

### 10.3 Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642272120
Retry-After: 120

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many GPX imports in short period",
    "details": {
      "limit": 10,
      "window": "5 minutes",
      "retry_after": 120
    }
  }
}
```

---

## 11. Pagination

### 11.1 Standard Pagination

All list endpoints support pagination:

```http
GET /api/v1/equipment?limit=50&offset=100
```

**Parameters:**
- `limit`: Max items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

**Response includes pagination metadata:**
```json
{
  "data": [...],
  "total": 250,
  "pagination": {
    "limit": 50,
    "offset": 100,
    "has_more": true,
    "next_offset": 150,
    "prev_offset": 50
  }
}
```

### 11.2 Cursor-Based Pagination (WebSocket Messages)

For real-time data streams:

```json
{
  "messages": [...],
  "cursor": {
    "next": "cursor-abc123",
    "has_more": true
  }
}
```

---

## 12. Webhooks

### 12.1 Register Webhook

**Endpoint:** `POST /webhooks`

**Description:** Register webhook for real-time event notifications

**Request:**
```http
POST /api/v1/webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://myapp.example.com/webhooks/wheels-and-wins",
  "events": [
    "trip.created",
    "trip.updated",
    "trip.shared",
    "equipment.maintenance_due",
    "checklist.completed"
  ],
  "secret": "webhook-secret-key-123"
}
```

**Response: 201 Created**
```json
{
  "webhook_id": "wh-xyz789",
  "url": "https://myapp.example.com/webhooks/wheels-and-wins",
  "events": [
    "trip.created",
    "trip.updated",
    "trip.shared",
    "equipment.maintenance_due",
    "checklist.completed"
  ],
  "status": "active",
  "created_at": "2025-01-15T22:00:00Z"
}
```

### 12.2 Webhook Event Format

```json
{
  "event_id": "evt-abc123",
  "event_type": "trip.created",
  "timestamp": "2025-01-15T22:05:00Z",
  "data": {
    "trip_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "user_id": "user-123",
    "title": "California Coastal Drive",
    "created_at": "2025-01-15T22:05:00Z"
  },
  "webhook_id": "wh-xyz789"
}
```

**Headers:**
```http
X-Webhook-Signature: sha256=abc123...
X-Event-Type: trip.created
X-Event-ID: evt-abc123
```

---

## Summary

This API design provides:

- **60+ new endpoints** for enhanced trip planning features
- **RESTful conventions** with consistent naming and structure
- **Comprehensive error handling** with detailed error codes
- **Real-time collaboration** via WebSocket
- **Security** through JWT authentication and permissions
- **Performance** through pagination and rate limiting
- **Developer experience** with detailed documentation and examples

---

**Document Status:** ✅ Complete
**Last Updated:** January 2025
**Version:** 1.0
**Related Documents:**
- TECHNICAL_SPEC.md (implementation details)
- INTEGRATION_PLAN.md (deployment roadmap)
- CODEBASE_ANALYSIS.md (current system overview)
