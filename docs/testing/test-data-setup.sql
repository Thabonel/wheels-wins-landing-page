-- PAM Trip Editing Test Data Setup
-- Purpose: Create realistic PAM trips for comprehensive testing
-- Usage: Replace {user_id} with actual test user ID before execution
-- Environment: Run on staging database only

-- Ensure we have the user_trips table structure
-- NOTE: This table is referenced in code but not in DATABASE_SCHEMA_REFERENCE.md
-- Verify table exists before running this script

-- Test Data Setup for PAM Trip Editing Workflow Testing

-- Test Trip 1: Comprehensive PAM Road Trip with Full Route Data
INSERT INTO user_trips (
    user_id,
    title,
    description,
    status,
    trip_type,
    total_budget,
    privacy_level,
    metadata,
    created_at,
    updated_at
) VALUES (
    '{user_id}',
    'PAM''s Great Ocean Road Adventure',
    '[PAM AI Generated] Scenic coastal drive featuring the iconic Great Ocean Road with stunning ocean views, charming seaside towns, and the famous Twelve Apostles limestone formations.',
    'planning',
    'road_trip',
    NULL,
    'private',
    '{
        "created_by": "pam_ai",
        "source": "pam",
        "pam_conversation_id": "conv_test_123",
        "pam_response": "I''ve planned a beautiful coastal adventure for you! This route follows the famous Great Ocean Road with spectacular ocean views.",
        "route_data": {
            "waypoints": [
                {
                    "name": "Melbourne, VIC, Australia",
                    "coordinates": [144.9631, -37.8136],
                    "address": "Melbourne VIC, Australia",
                    "type": "start"
                },
                {
                    "name": "Geelong, VIC, Australia",
                    "coordinates": [144.3601, -38.1500],
                    "address": "Geelong VIC 3220, Australia",
                    "type": "waypoint"
                },
                {
                    "name": "Torquay, VIC, Australia",
                    "coordinates": [144.3266, -38.3302],
                    "address": "Torquay VIC 3228, Australia",
                    "type": "waypoint"
                },
                {
                    "name": "Apollo Bay, VIC, Australia",
                    "coordinates": [143.6697, -38.7568],
                    "address": "Apollo Bay VIC 3233, Australia",
                    "type": "waypoint"
                },
                {
                    "name": "Port Campbell, VIC, Australia",
                    "coordinates": [142.9820, -38.6267],
                    "address": "Port Campbell VIC 3269, Australia",
                    "type": "destination"
                }
            ],
            "route": {
                "type": "LineString",
                "coordinates": [
                    [144.9631, -37.8136],
                    [144.5000, -37.9000],
                    [144.3601, -38.1500],
                    [144.3266, -38.3302],
                    [144.0000, -38.5000],
                    [143.6697, -38.7568],
                    [143.2000, -38.7000],
                    [142.9820, -38.6267]
                ]
            },
            "distance": 243500,
            "duration": 10800,
            "profile": "driving",
            "created_timestamp": "2026-02-01T10:30:00Z"
        }
    }'::jsonb,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
);

-- Test Trip 2: PAM Camping Trip with Budget and Complex Metadata
INSERT INTO user_trips (
    user_id,
    title,
    description,
    status,
    trip_type,
    total_budget,
    spent_budget,
    privacy_level,
    metadata,
    created_at,
    updated_at
) VALUES (
    '{user_id}',
    'PAM''s Blue Mountains Camping Experience',
    '[PAM AI Generated] Perfect mountain camping adventure featuring beautiful hiking trails, scenic lookouts, and peaceful camping spots in the Blue Mountains National Park.',
    'planning',
    'camping',
    850.00,
    0.00,
    'private',
    '{
        "created_by": "pam_ai",
        "source": "pam",
        "pam_conversation_id": "conv_test_456",
        "pam_response": "I''ve designed a fantastic camping trip in the Blue Mountains with amazing hiking opportunities and scenic views!",
        "budget_breakdown": {
            "accommodation": 200,
            "fuel": 120,
            "food": 300,
            "activities": 150,
            "emergency": 80
        },
        "route_data": {
            "waypoints": [
                {
                    "name": "Sydney, NSW, Australia",
                    "coordinates": [151.2093, -33.8688],
                    "address": "Sydney NSW, Australia",
                    "type": "start"
                },
                {
                    "name": "Katoomba, NSW, Australia",
                    "coordinates": [150.3069, -33.7127],
                    "address": "Katoomba NSW 2780, Australia",
                    "type": "waypoint",
                    "notes": "Three Sisters lookout and scenic railway"
                },
                {
                    "name": "Leura, NSW, Australia",
                    "coordinates": [150.3334, -33.7173],
                    "address": "Leura NSW 2780, Australia",
                    "type": "waypoint",
                    "notes": "Leura Cascades and bushwalking trails"
                },
                {
                    "name": "Wentworth Falls, NSW, Australia",
                    "coordinates": [150.3737, -33.7086],
                    "address": "Wentworth Falls NSW 2782, Australia",
                    "type": "destination",
                    "notes": "Camping area and waterfall views"
                }
            ],
            "route": {
                "type": "LineString",
                "coordinates": [
                    [151.2093, -33.8688],
                    [150.8000, -33.7500],
                    [150.3069, -33.7127],
                    [150.3334, -33.7173],
                    [150.3737, -33.7086]
                ]
            },
            "distance": 145000,
            "duration": 7200,
            "profile": "driving",
            "estimated_hiking_distance": 25000,
            "created_timestamp": "2026-02-01T11:15:00Z"
        }
    }'::jsonb,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
);

-- Test Trip 3: Minimal PAM Trip (Edge Case Testing)
INSERT INTO user_trips (
    user_id,
    title,
    description,
    status,
    trip_type,
    privacy_level,
    metadata,
    created_at,
    updated_at
) VALUES (
    '{user_id}',
    'PAM Quick City Trip',
    '[PAM AI Generated] Simple city-to-city route for testing minimal data scenarios.',
    'planning',
    'business',
    'private',
    '{
        "created_by": "pam_ai",
        "source": "pam",
        "pam_conversation_id": "conv_test_minimal",
        "route_data": {
            "waypoints": [
                {
                    "name": "Brisbane, QLD",
                    "coordinates": [153.0260, -27.4705],
                    "type": "start"
                },
                {
                    "name": "Gold Coast, QLD",
                    "coordinates": [153.4000, -28.0167],
                    "type": "destination"
                }
            ],
            "distance": 78000,
            "duration": 4800,
            "profile": "driving"
        }
    }'::jsonb,
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes'
);

-- Test Trip 4: PAM Trip with Missing Route Geometry (Error Testing)
INSERT INTO user_trips (
    user_id,
    title,
    description,
    status,
    trip_type,
    privacy_level,
    metadata,
    created_at,
    updated_at
) VALUES (
    '{user_id}',
    'PAM Trip - No Geometry',
    '[PAM AI Generated] Test trip with missing route geometry for error handling verification.',
    'planning',
    'road_trip',
    'private',
    '{
        "created_by": "pam_ai",
        "source": "pam",
        "route_data": {
            "waypoints": [
                {
                    "name": "Perth, WA",
                    "coordinates": [115.8605, -31.9505]
                },
                {
                    "name": "Fremantle, WA",
                    "coordinates": [115.7455, -32.0555]
                }
            ]
        }
    }'::jsonb,
    NOW() - INTERVAL '5 minutes',
    NOW() - INTERVAL '5 minutes'
);

-- Test Trip 5: Manual Trip for Comparison
INSERT INTO user_trips (
    user_id,
    title,
    description,
    status,
    trip_type,
    total_budget,
    privacy_level,
    metadata,
    created_at,
    updated_at
) VALUES (
    '{user_id}',
    'Manual Weekend Getaway',
    'User-created trip to the Hunter Valley for wine tasting and relaxation.',
    'planning',
    'vacation',
    600.00,
    'private',
    '{
        "created_by": "user",
        "source": "manual",
        "route_data": {
            "waypoints": [
                {
                    "name": "Newcastle, NSW",
                    "coordinates": [151.7817, -32.9267],
                    "type": "start"
                },
                {
                    "name": "Hunter Valley, NSW",
                    "coordinates": [151.1751, -32.7373],
                    "type": "destination"
                }
            ],
            "route": {
                "type": "LineString",
                "coordinates": [
                    [151.7817, -32.9267],
                    [151.1751, -32.7373]
                ]
            },
            "distance": 65000,
            "duration": 3600,
            "profile": "driving"
        }
    }'::jsonb,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
);

-- Test Trip 6: PAM Trip with Complex Multi-Day Route
INSERT INTO user_trips (
    user_id,
    title,
    description,
    status,
    trip_type,
    total_budget,
    privacy_level,
    metadata,
    start_date,
    end_date,
    created_at,
    updated_at
) VALUES (
    '{user_id}',
    'PAM''s Ultimate Australian East Coast Adventure',
    '[PAM AI Generated] Epic 10-day road trip covering the best of Australia''s east coast from Sydney to Cairns, including coastal towns, national parks, and iconic landmarks.',
    'planning',
    'road_trip',
    2500.00,
    'private',
    '{
        "created_by": "pam_ai",
        "source": "pam",
        "pam_conversation_id": "conv_test_epic",
        "trip_duration_days": 10,
        "route_data": {
            "waypoints": [
                {"name": "Sydney, NSW", "coordinates": [151.2093, -33.8688], "day": 1},
                {"name": "Byron Bay, NSW", "coordinates": [153.6167, -28.6474], "day": 2},
                {"name": "Gold Coast, QLD", "coordinates": [153.4000, -28.0167], "day": 3},
                {"name": "Brisbane, QLD", "coordinates": [153.0260, -27.4705], "day": 4},
                {"name": "Noosa, QLD", "coordinates": [153.0920, -26.3858], "day": 5},
                {"name": "Fraser Island, QLD", "coordinates": [153.1000, -25.2400], "day": 6},
                {"name": "Rockhampton, QLD", "coordinates": [150.5070, -23.3781], "day": 7},
                {"name": "Airlie Beach, QLD", "coordinates": [148.7167, -20.2667], "day": 8},
                {"name": "Townsville, QLD", "coordinates": [146.8169, -19.2590], "day": 9},
                {"name": "Cairns, QLD", "coordinates": [145.7781, -16.9186], "day": 10}
            ],
            "route": {
                "type": "LineString",
                "coordinates": [
                    [151.2093, -33.8688], [153.6167, -28.6474], [153.4000, -28.0167],
                    [153.0260, -27.4705], [153.0920, -26.3858], [153.1000, -25.2400],
                    [150.5070, -23.3781], [148.7167, -20.2667], [146.8169, -19.2590],
                    [145.7781, -16.9186]
                ]
            },
            "distance": 2150000,
            "duration": 86400,
            "profile": "driving"
        }
    }'::jsonb,
    '2026-03-01',
    '2026-03-10',
    NOW() - INTERVAL '1 week',
    NOW() - INTERVAL '1 week'
);

-- Verification queries to confirm data insertion
-- Run these after inserting test data

-- Count PAM trips created
SELECT
    COUNT(*) as pam_trips_count,
    COUNT(CASE WHEN metadata->>'created_by' != 'pam_ai' THEN 1 END) as manual_trips_count
FROM user_trips
WHERE user_id = '{user_id}';

-- Verify PAM trip metadata structure
SELECT
    title,
    metadata->>'created_by' as creator,
    metadata->>'source' as source,
    jsonb_array_length(metadata->'route_data'->'waypoints') as waypoint_count,
    metadata->'route_data'->>'distance' as distance,
    status,
    trip_type
FROM user_trips
WHERE user_id = '{user_id}'
  AND metadata->>'created_by' = 'pam_ai'
ORDER BY created_at DESC;

-- Check route geometry data
SELECT
    title,
    CASE
        WHEN metadata->'route_data'->'route' IS NOT NULL THEN 'Has geometry'
        ELSE 'Missing geometry'
    END as geometry_status,
    metadata->'route_data'->'route'->>'type' as geometry_type
FROM user_trips
WHERE user_id = '{user_id}'
ORDER BY created_at DESC;

-- Test data cleanup (uncomment to remove test data)
-- DELETE FROM user_trips WHERE user_id = '{user_id}' AND title LIKE 'PAM%';
-- DELETE FROM user_trips WHERE user_id = '{user_id}' AND title LIKE 'Manual Weekend%';