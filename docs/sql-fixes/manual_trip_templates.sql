-- Popular Australian RV Trip Templates
-- Run this SQL in your Supabase dashboard to add comprehensive trip templates

-- Get user ID first (replace with your actual user ID)
-- SELECT id FROM auth.users LIMIT 1;

INSERT INTO trip_templates (
    user_id,
    name,
    description,
    category,
    is_public,
    tags,
    usage_count,
    template_data
) VALUES 

-- Great Ocean Road Classic
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a', -- Replace with your user ID
    'Great Ocean Road Classic',
    'Melbourne to Adelaide coastal adventure featuring the iconic Twelve Apostles and charming seaside towns.',
    'coastal_routes',
    true,
    ARRAY['australia', 'rv', 'coastal', 'scenic'],
    0,
    '{
        "title": "Great Ocean Road Classic",
        "description": "Experience one of the world''s most scenic coastal drives from Melbourne to Adelaide. This route showcases dramatic limestone cliffs, pristine beaches, and the famous Twelve Apostles. Perfect for RV travelers with excellent facilities and stunning overnight stops.",
        "difficulty": "beginner",
        "duration_days": 7,
        "distance_miles": 400,
        "estimated_budget": 1200,
        "currency": "AUD",
        "highlights": ["Twelve Apostles", "Port Campbell", "Lorne Beach", "Apollo Bay"],
        "route_type": "coastal_scenic",
        "vehicle_requirements": ["RV", "Motorhome", "Caravan"],
        "best_season": "October to April",
        "key_locations": ["Melbourne", "Torquay", "Apollo Bay", "Port Campbell", "Warrnambool", "Adelaide"],
        "challenges": ["Narrow coastal roads", "Tourist crowds in summer"],
        "tips": ["Book accommodation early in peak season", "Allow extra time for photo stops", "Check weather for Port Campbell area"],
        "region": "Victoria/South Australia"
    }'::jsonb
),

-- Big Lap Australia
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'The Big Lap - Around Australia',
    'Complete circumnavigation of Australia covering all states and territories. The ultimate Australian RV adventure.',
    'epic_journeys',
    true,
    ARRAY['australia', 'rv', 'big_lap', 'epic'],
    0,
    '{
        "title": "The Big Lap - Around Australia",
        "description": "The ultimate Australian adventure - drive around the entire continent covering over 15,000km of diverse landscapes. From tropical Queensland to the red center, pristine WA beaches to Tasmania''s wilderness. Requires 6-12 months and careful planning.",
        "difficulty": "advanced",
        "duration_days": 365,
        "distance_miles": 9300,
        "estimated_budget": 50000,
        "currency": "AUD",
        "highlights": ["Uluru", "Great Barrier Reef", "Kimberley", "Tasmania", "Nullarbor Plain"],
        "route_type": "epic_circumnavigation",
        "vehicle_requirements": ["Self-contained RV", "4WD capable for remote areas"],
        "best_season": "Depends on region - plan carefully",
        "key_locations": ["Darwin", "Cairns", "Brisbane", "Sydney", "Melbourne", "Adelaide", "Perth", "Broome"],
        "challenges": ["Remote areas with limited services", "Extreme weather conditions", "Long distances between towns"],
        "tips": ["Plan fuel and water stops carefully", "Join Big Lap Facebook groups", "Consider seasonal timing for each region"],
        "region": "All Australia"
    }'::jsonb
),

-- Pacific Coast Highway
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'Pacific Coast Explorer',
    'Sydney to Cairns coastal journey through NSW and Queensland, featuring beautiful beaches and rainforests.',
    'coastal_routes',
    true,
    ARRAY['australia', 'rv', 'pacific_coast', 'beaches'],
    0,
    '{
        "title": "Pacific Coast Explorer",
        "description": "Journey along Australia''s spectacular Pacific coastline from Sydney to Cairns. Experience world-class beaches, subtropical rainforests, charming coastal towns, and access to the Great Barrier Reef. Perfect for RV travelers with excellent infrastructure.",
        "difficulty": "intermediate", 
        "duration_days": 21,
        "distance_miles": 1200,
        "estimated_budget": 4200,
        "currency": "AUD",
        "highlights": ["Byron Bay", "Gold Coast", "Sunshine Coast", "Great Barrier Reef"],
        "route_type": "coastal_highway",
        "vehicle_requirements": ["RV", "Motorhome", "Caravan"],
        "best_season": "April to October",
        "key_locations": ["Sydney", "Port Macquarie", "Byron Bay", "Gold Coast", "Brisbane", "Noosa", "Cairns"],
        "challenges": ["Tourist traffic in peak season", "Tropical weather in far north"],
        "tips": ["Book ferry to Fraser Island in advance", "Carry insect repellent for tropical areas", "Plan reef trips from Cairns"],
        "region": "NSW/Queensland"
    }'::jsonb
),

-- Red Centre Adventure (Updated)
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'Red Centre Explorer',
    'Uluru, Kings Canyon and MacDonnell Ranges outback adventure with iconic landmarks and Aboriginal culture.',
    'outback_adventures',
    true,
    ARRAY['australia', 'rv', 'outback', 'uluru'],
    0,
    '{
        "title": "Red Centre Explorer", 
        "description": "Discover the spiritual heart of Australia with this outback adventure to Uluru, Kata Tjuta, Kings Canyon, and Alice Springs. Experience ancient Aboriginal culture, stunning desert landscapes, and unforgettable sunrises over the world''s largest monolith.",
        "difficulty": "advanced",
        "duration_days": 14,
        "distance_miles": 800,
        "estimated_budget": 2800,
        "currency": "AUD",
        "highlights": ["Uluru", "Kings Canyon", "Alice Springs", "MacDonnell Ranges"],
        "route_type": "outback_cultural",
        "vehicle_requirements": ["RV", "Motorhome suitable for sealed roads"],
        "best_season": "April to September",
        "key_locations": ["Alice Springs", "Uluru", "Kata Tjuta", "Kings Canyon", "Coober Pedy"],
        "challenges": ["Extreme heat in summer", "Limited services between towns", "Remote area driving"],
        "tips": ["Carry extra water", "Respect Aboriginal cultural sites", "Book Uluru accommodation well ahead"],
        "region": "Northern Territory/South Australia"
    }'::jsonb
),

-- Stuart Highway Epic
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'Stuart Highway Darwin to Adelaide',
    'Cross the continent north to south on Australia''s most famous highway through the heart of the continent.',
    'highway_crossings',
    true,
    ARRAY['australia', 'rv', 'stuart_highway', 'cross_country'],
    0,
    '{
        "title": "Stuart Highway Darwin to Adelaide",
        "description": "Traverse the entire continent from tropical Darwin to Adelaide on the legendary Stuart Highway. Pass through the red heart of Australia, historic outback towns, and diverse climatic zones. One of Australia''s great road trip experiences.",
        "difficulty": "intermediate",
        "duration_days": 14,
        "distance_miles": 1760,
        "estimated_budget": 3500,
        "currency": "AUD",
        "highlights": ["Darwin", "Katherine Gorge", "Alice Springs", "Coober Pedy"],
        "route_type": "transcontinental_highway",
        "vehicle_requirements": ["RV", "Motorhome", "Road train suitable caravan"],
        "best_season": "April to September",
        "key_locations": ["Darwin", "Katherine", "Tennant Creek", "Alice Springs", "Coober Pedy", "Adelaide"],
        "challenges": ["Road trains", "Long distances between services", "Extreme heat"],
        "tips": ["Give way to road trains", "Fuel up at every opportunity", "Plan rest stops carefully"],
        "region": "Northern Territory/South Australia"
    }'::jsonb
),

-- Tasmania Circuit
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'Tasmania Island Circuit',
    'Complete circuit of Tasmania featuring Cradle Mountain, MONA, Wineglass Bay, and pristine wilderness.',
    'island_adventures',
    true,
    ARRAY['australia', 'rv', 'tasmania', 'wilderness'],
    0,
    '{
        "title": "Tasmania Island Circuit",
        "description": "Discover Australia''s island state with this comprehensive circuit covering Hobart, Cradle Mountain-Lake St Clair, Wineglass Bay, and the Museum of Old and New Art. Experience temperate rainforests, pristine beaches, and world-class wine regions.",
        "difficulty": "intermediate",
        "duration_days": 14,
        "distance_miles": 900,
        "estimated_budget": 3200,
        "currency": "AUD",
        "highlights": ["Cradle Mountain", "Wineglass Bay", "MONA", "Salamanca Markets"],
        "route_type": "island_circuit",
        "vehicle_requirements": ["RV", "Motorhome", "Caravan"],
        "best_season": "October to April",
        "key_locations": ["Hobart", "Cradle Mountain", "Launceston", "Freycinet", "Strahan", "Devonport"],
        "challenges": ["Mountain roads", "Variable weather", "Ferry booking required"],
        "tips": ["Book Spirit of Tasmania ferry early", "Pack warm clothes", "Allow time for hiking"],
        "region": "Tasmania"
    }'::jsonb
),

-- Western Australia Coast
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'WA Coast Perth to Broome',
    'Western Australia''s spectacular coastline featuring pristine beaches, coral reefs, and outback towns.',
    'coastal_routes',
    true,
    ARRAY['australia', 'rv', 'western_australia', 'beaches'],
    0,
    '{
        "title": "WA Coast Perth to Broome",
        "description": "Experience Western Australia''s incredible coastline from Perth to Broome. Discover pristine beaches, coral reefs, historic pearling towns, and the famous Cable Beach sunset. Includes optional Karijini National Park detour for stunning gorge country.",
        "difficulty": "intermediate",
        "duration_days": 18,
        "distance_miles": 1400,
        "estimated_budget": 4000,
        "currency": "AUD",
        "highlights": ["Cable Beach", "Ningaloo Reef", "Karijini National Park", "Shark Bay"],
        "route_type": "coastal_outback",
        "vehicle_requirements": ["RV", "Motorhome", "4WD for some tracks"],
        "best_season": "April to September",
        "key_locations": ["Perth", "Geraldton", "Shark Bay", "Exmouth", "Karratha", "Port Hedland", "Broome"],
        "challenges": ["Long distances", "Limited services", "Extreme heat in summer"],
        "tips": ["Fuel up regularly", "Book Ningaloo reef tours", "Carry extra water"],
        "region": "Western Australia"
    }'::jsonb
),

-- Nullarbor Crossing
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'Nullarbor Plain Crossing',
    'Cross the famous Nullarbor Plain from Adelaide to Perth - one of Australia''s most challenging drives.',
    'highway_crossings',
    true,
    ARRAY['australia', 'rv', 'nullarbor', 'outback'],
    0,
    '{
        "title": "Nullarbor Plain Crossing",
        "description": "Conquer the legendary Nullarbor Plain crossing from Adelaide to Perth. Experience the world''s longest straight road, dramatic coastal cliffs, and the solitude of one of Earth''s largest limestone plateaus. A true test of endurance and planning.",
        "difficulty": "advanced",
        "duration_days": 7,
        "distance_miles": 1200,
        "estimated_budget": 1800,
        "currency": "AUD",
        "highlights": ["Head of Bight whales", "90 Mile Straight", "Great Australian Bight", "Border Village"],
        "route_type": "outback_crossing",
        "vehicle_requirements": ["Reliable RV", "Self-contained recommended"],
        "best_season": "April to October",
        "key_locations": ["Adelaide", "Ceduna", "Border Village", "Eucla", "Norseman", "Perth"],
        "challenges": ["Limited services", "Extreme isolation", "Vehicle reliability critical"],
        "tips": ["Carry spare parts", "Extra fuel and water", "Check weather conditions"],
        "region": "South Australia/Western Australia"
    }'::jsonb
),

-- Queensland Outback Adventure
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'Queensland Outback Explorer',
    'Explore Queensland''s vast outback including Longreach, Winton, and historic mining towns.',
    'outback_adventures',
    true,
    ARRAY['australia', 'rv', 'queensland', 'outback'],
    0,
    '{
        "title": "Queensland Outback Explorer",
        "description": "Discover Queensland''s fascinating outback heritage from Brisbane through Roma, Charleville, Longreach, and Winton. Experience Australian stockman culture, dinosaur fossils, and the birthplace of QANTAS. Perfect introduction to outback travel.",
        "difficulty": "intermediate",
        "duration_days": 12,
        "distance_miles": 1100,
        "estimated_budget": 2800,
        "currency": "AUD",
        "highlights": ["Stockman''s Hall of Fame", "Dinosaur fossils", "QANTAS museum", "Outback pubs"],
        "route_type": "outback_heritage",
        "vehicle_requirements": ["RV", "Motorhome", "Caravan"],
        "best_season": "April to September",
        "key_locations": ["Brisbane", "Roma", "Charleville", "Longreach", "Winton", "Mount Isa"],
        "challenges": ["Heat in summer", "Long distances", "Limited services"],
        "tips": ["Visit during cooler months", "Book ahead in small towns", "Carry extra supplies"],
        "region": "Queensland"
    }'::jsonb
),

-- Blue Mountains and Wine Country
(
    '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
    'Blue Mountains and Wine Country',
    'Sydney to Melbourne via Blue Mountains, Canberra, and alpine regions with wine tasting opportunities.',
    'mountain_scenic',
    true,
    ARRAY['australia', 'rv', 'mountains', 'wine'],
    0,
    '{
        "title": "Blue Mountains and Wine Country",
        "description": "Experience the best of NSW and Victoria''s mountain and wine regions. From Sydney''s Blue Mountains through Canberra to Melbourne via Beechworth and the Murray Valley. Perfect blend of scenic mountain drives and world-class wine regions.",
        "difficulty": "beginner",
        "duration_days": 10,
        "distance_miles": 650,
        "estimated_budget": 2200,
        "currency": "AUD",
        "highlights": ["Blue Mountains", "Canberra", "Rutherglen wines", "Alpine Way"],
        "route_type": "scenic_wine",
        "vehicle_requirements": ["RV", "Motorhome", "Caravan"],
        "best_season": "September to May",
        "key_locations": ["Sydney", "Katoomba", "Canberra", "Albury", "Beechworth", "Melbourne"],
        "challenges": ["Mountain roads", "Tourist areas", "Weather changes"],
        "tips": ["Designated driver for wine tours", "Book mountain accommodation ahead", "Check road conditions"],
        "region": "NSW/ACT/Victoria"
    }'::jsonb
);