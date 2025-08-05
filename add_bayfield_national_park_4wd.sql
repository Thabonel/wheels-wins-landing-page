-- Add Bayfield National Park 4WD Trip to offroad_routes table
-- Bayfield National Park is located near Byfield, Queensland, Australia
-- Known for its diverse landscapes including coastal areas, wetlands, and 4WD tracks

INSERT INTO offroad_routes (
    route_name,
    route_description,
    distance_miles,
    estimated_time_hours,
    difficulty_level,
    scenic_rating,
    vehicle_requirements,
    safety_notes,
    start_location,
    end_location,
    latitude,
    longitude,
    region,
    best_season,
    highlights,
    track_conditions,
    permit_required,
    created_at,
    updated_at
) VALUES (
    'Bayfield National Park 4WD Adventure',
    'Explore the diverse landscapes of Bayfield National Park near Byfield, Queensland. This 4WD adventure takes you through coastal heathlands, wetlands, and along pristine beaches. Experience the famous Stockyard Point camping area and enjoy fishing, swimming, and wildlife spotting. The park offers excellent 4WD tracks suitable for intermediate to advanced drivers.',
    25, -- Distance in miles (approximately 40km of tracks)
    6,  -- Estimated time in hours (full day trip)
    'intermediate', -- Difficulty level
    9,  -- Scenic rating out of 10
    'High clearance 4WD vehicle required, All-terrain tires recommended, Recovery gear essential',
    'Sand driving experience helpful. Check tide times for beach driving. Carry recovery equipment. Park entry fees apply. Camping permits required for overnight stays. No fuel or supplies available in park.',
    'Byfield Township, QLD',
    'Stockyard Point, Bayfield National Park',
    -22.7167, -- Latitude for Bayfield National Park
    150.6833, -- Longitude for Bayfield National Park
    'Queensland',
    'April to October (dry season recommended)',
    ARRAY[
        'Stockyard Point camping and beach access',
        'Waterpark Creek 4WD track',
        'Raspberry Creek camping area',
        'Nine Mile Beach driving',
        'Coastal heathlands and wetlands',
        'Fishing and swimming opportunities',
        'Wildlife viewing (kangaroos, birds, marine life)',
        'Historical homestead ruins'
    ],
    'Sandy tracks, creek crossings, beach driving, some rocky sections. Conditions vary with weather and tides.',
    true, -- Permit required
    NOW(),
    NOW()
);

-- Also add to trip_templates table for broader visibility
INSERT INTO trip_templates (
    user_id,
    name,
    description,
    category,
    is_public,
    tags,
    usage_count,
    template_data
) VALUES (
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a', -- Replace with appropriate user ID
    'Bayfield National Park 4WD Explorer',
    'Experience Queensland''s premier 4WD destination with coastal camping, beach driving, and pristine wilderness tracks.',
    '4wd_adventures',
    true,
    ARRAY['australia', '4wd', 'camping', 'beach', 'fishing', 'queensland'],
    0,
    '{
        "title": "Bayfield National Park 4WD Explorer",
        "description": "Discover one of Queensland''s hidden gems for 4WD enthusiasts. Bayfield National Park offers an incredible variety of terrain from coastal heathlands to pristine beaches and challenging inland tracks. Based near the historic township of Byfield, this adventure combines excellent 4WD driving with world-class fishing, swimming, and camping opportunities.",
        "difficulty": "intermediate",
        "duration_days": 3,
        "distance_miles": 25,
        "estimated_budget": 350,
        "currency": "AUD",
        "highlights": [
            "Stockyard Point beach camping",
            "Nine Mile Beach 4WD driving", 
            "Waterpark Creek track",
            "Raspberry Creek camping",
            "Fishing and crabbing",
            "Wildlife viewing",
            "Historical sites"
        ],
        "route_type": "4wd_coastal",
        "vehicle_requirements": [
            "High clearance 4WD vehicle",
            "All-terrain tires minimum",
            "Recovery gear essential",
            "Sand tracks/maxtrax recommended"
        ],
        "best_season": "April to October",
        "key_locations": [
            "Byfield Township",
            "Waterpark Creek",
            "Stockyard Point",
            "Raspberry Creek",
            "Nine Mile Beach"
        ],
        "challenges": [
            "Sand driving techniques required",
            "Tide-dependent beach access",
            "Creek crossings",
            "Remote location - limited services",
            "Park permits and fees required"
        ],
        "tips": [
            "Check park website for current track conditions",
            "Book camping permits well in advance",
            "Carry recovery equipment and know how to use it",
            "Check tide times for beach driving",
            "Bring all supplies - no shops in park",
            "Practice sand driving if inexperienced",
            "Respect wildlife and stay on designated tracks"
        ],
        "region": "Queensland",
        "coordinates": {
            "latitude": -22.7167,
            "longitude": 150.6833,
            "zoom": 10
        },
        "park_info": {
            "permits_required": true,
            "entry_fees": true,
            "camping_available": true,
            "facilities": ["Pit toilets", "Picnic tables", "Fire rings"],
            "restrictions": ["4WD access only", "No pets", "No generators at Stockyard Point"]
        }
    }'::jsonb
);

-- Add some sample waypoints for the Bayfield National Park route
INSERT INTO route_waypoints (
    route_id,
    sequence_order,
    name,
    description,
    latitude,
    longitude,
    waypoint_type,
    estimated_time_minutes,
    special_instructions
) VALUES 
-- Starting point
((SELECT id FROM offroad_routes WHERE route_name = 'Bayfield National Park 4WD Adventure'), 1, 'Byfield Township', 'Start point - last fuel and supplies', -22.7333, 150.6500, 'start', 0, 'Fuel up and check supplies'),

-- Entry point
((SELECT id FROM offroad_routes WHERE route_name = 'Bayfield National Park 4WD Adventure'), 2, 'Park Entry Gate', 'National Park entry point - pay fees', -22.7200, 150.6700, 'checkpoint', 15, 'Entry fees required - self-registration if unstaffed'),

-- Major track junction
((SELECT id FROM offroad_routes WHERE route_name = 'Bayfield National Park 4WD Adventure'), 3, 'Waterpark Creek Track', 'Scenic 4WD track through heathlands', -22.7100, 150.6800, 'scenic', 45, 'Sandy track - air down tires for better traction'),

-- Camping area
((SELECT id FROM offroad_routes WHERE route_name = 'Bayfield National Park 4WD Adventure'), 4, 'Raspberry Creek Camping', 'Remote bush camping area', -22.7000, 150.6900, 'camping', 75, 'Basic facilities only - bring all supplies'),

-- Beach access
((SELECT id FROM offroad_routes WHERE route_name = 'Bayfield National Park 4WD Adventure'), 5, 'Nine Mile Beach Access', 'Beach driving access point', -22.6900, 150.7100, 'beach_access', 90, 'Check tides - beach driving only at low tide'),

-- Main destination
((SELECT id FROM offroad_routes WHERE route_name = 'Bayfield National Park 4WD Adventure'), 6, 'Stockyard Point', 'Premier beach camping destination', -22.6800, 150.7200, 'destination', 120, 'Spectacular camping right on the beach - book ahead');

-- Create a comment for the database admin
-- Note: This script assumes the following table structures exist:
-- 1. offroad_routes table for 4WD specific routes
-- 2. trip_templates table for general trip planning
-- 3. route_waypoints table for detailed route guidance
-- 
-- If any of these tables don't exist, the relevant INSERT statements will fail
-- but won't affect the others due to separate transactions.
--
-- Bayfield National Park details:
-- - Location: Near Byfield, Queensland, Australia  
-- - Coordinates: -22.7167°S, 150.6833°E
-- - Known for: 4WD beach access, camping, fishing, diverse ecosystems
-- - Season: Best April-October (dry season)
-- - Requirements: 4WD vehicle, park permits, camping permits
-- - Facilities: Basic camping facilities, no supplies available in park