-- Add comprehensive Australian free camping knowledge to PAM's admin knowledge base
-- Converted from Unimog Community Hub camping guides
-- Run this in Supabase SQL Editor or your PostgreSQL client

BEGIN;

-- 1. Australian Interstate Free Camping Overview
INSERT INTO public.pam_admin_knowledge (
    admin_user_id,
    title,
    content,
    knowledge_type,
    category,
    priority,
    is_active,
    location_context,
    tags
) VALUES (
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), -- Auto-select admin user
    'Australian Interstate Free Camping Overview',
    'Free camping rules vary dramatically across Australian states:

**FREE CAMPING IN STATE FORESTS:**
✅ Victoria: Full dispersed camping allowed in State Forests
✅ Tasmania: Free camping in PTPZ (State Forest) areas

**NO FREE CAMPING IN STATE FORESTS:**
❌ Queensland: All parks/forests require paid permits
❌ Western Australia: State Forests require fees and booking
❌ South Australia: All parks require paid permits
❌ Northern Territory: National parks require fees

**UNIVERSAL FREE CAMPING OPTIONS:**
- Roadside Rest Areas (all states - 24-72hr limits)
- Council Free Camps (regional towns across Australia)
- Crown Land (remote areas, be self-sufficient)
- Station Stays (with permission, often donation-based)

**UNIVERSAL RULES:**
- No urban/town camping without permits
- Leave No Trace principles mandatory
- Check fire restrictions and total fire bans
- Stay limits typically 24-72 hours
- Self-contained rigs often required',
    'general_knowledge',
    'travel',
    9,
    true,
    'Australia',
    ARRAY['australia', 'free-camping', 'interstate', 'state-forests', 'travel-rules']
);

-- 2. Queensland Free Camping Rules and Locations
INSERT INTO public.pam_admin_knowledge (
    admin_user_id,
    title,
    content,
    knowledge_type,
    category,
    priority,
    is_active,
    location_context,
    tags
) VALUES (
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    'Queensland Free Camping Rules and Locations',
    'CRITICAL: NO free camping in Queensland State Forests or National Parks. All official parks require paid permits with regular ranger patrols.

**FREE CAMPING OPTIONS:**
- Roadside Rest Areas (24-48hr max stay, often with toilets/tables)
- Council Free Camps (regional towns, encourage traveller spending)
- Donation Camps (gold-coin donation, basic facilities)
- Remote Crown Land (outback areas, completely self-sufficient)

**PROVEN FREE CAMPING SPOTS:**

🏖️ **Notch Point (near Mackay)** - Best free camp in QLD, beachfront, 4WD access only, fishing/crabbing, NO facilities - self-contained only

🌊 **Futter Creek (Boyne Valley)** - Council-run free camp by water, grassy sites, toilets available, good for caravans and 4X4s

👻 **Mary Kathleen Abandoned Mine (west of Townsville)** - Ghost town exploration, camp under stars in mining ruins, no facilities

🏙️ **Bundaberg Riverside Parklands** - Council-supported free overnight, close to town for supply top-up

**BANNED AREAS:**
- All National Parks (require permits)
- All State Forests (unlike Victoria/NSW)
- Urban areas and beach carparks

**QLD RULES:**
- Stay limits: 24-72 hours maximum
- Self-contained rigs expected
- Pack out all rubbish (often no bins)
- Respect locals - community goodwill keeps sites open',
    'travel_rule',
    'travel',
    8,
    true,
    'Queensland, Australia',
    ARRAY['queensland', 'qld', 'free-camping', 'rules', 'locations', 'notch-point', 'mackay']
);

-- 3. Tasmania State Forests Free Camping (PTPZ Areas)
INSERT INTO public.pam_admin_knowledge (
    admin_user_id,
    title,
    content,
    knowledge_type,
    category,
    priority,
    is_active,
    location_context,
    tags
) VALUES (
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    'Tasmania State Forests Free Camping (PTPZ Areas)',
    'Good news: Free camping IS allowed in Tasmanian State Forests (PTPZ - Permanent Timber Production Zones) managed by Sustainable Timber Tasmania (STT).

**KEY STATE FOREST CAMPING AREAS:**

**Southeast Tasmania:**
🌿 **Wielangta Forest** - Scenic forest drive between Orford and Copping
🌿 **Tahune Forest Reserve** - Near famous Tahune Airwalk

**Northwest Tasmania:**
🌿 **Savage River Forest** - Look for nearby Milkshakes Forest Reserve
🌿 **Upper Natone Forest Reserve** - Good 4X4 access into native bush

**Near Launceston:**
🌿 **Hollybank Forest Reserve** - Mixed-use, popular with mountain bikers

**Multiple Smaller Reserves:** Griffin, Brookerana, Jean Brook, Oldina, Springfield

**CAMPING GUIDELINES:**
- Free camping unless signed otherwise
- Set up away from roads and work sites
- No infrastructure - bring everything
- Stay duration flexible (be reasonable)

**OFF-LIMITS:**
❌ National Parks/Nature Reserves (require DPIPWE permits and fees)
❌ Parks-managed camping zones (have booking systems)
❌ Areas with "No Camping" signs

**WISE PRACTICES:**
- Bring everything: water, toilet facilities, fuel
- Fires only when safe - check total fire bans
- Short stays recommended - keeps areas open
- Obey signage - tracks close due to forestry operations',
    'location_tip',
    'travel',
    8,
    true,
    'Tasmania, Australia',
    ARRAY['tasmania', 'tas', 'state-forests', 'ptpz', 'free-camping', 'wielangta', 'tahune']
);

-- 4. Northern Territory Free Camping Areas and Rules
INSERT INTO public.pam_admin_knowledge (
    admin_user_id,
    title,
    content,
    knowledge_type,
    category,
    priority,
    is_active,
    location_context,
    tags
) VALUES (
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    'Northern Territory Free Camping Areas and Rules',
    'NT has relaxed rules due to huge distances and low population. National Parks charge small fees ($3-$6 per adult per night) but abundant free camping exists.

**FREE CAMPING OPTIONS:**
- 24-Hour Roadside Rest Areas (Stuart, Barkly, Victoria Highways)
- Council-Managed Camps (attract travellers to boost economy)
- Remote Crown Land (much of NT, bush camping accepted)
- Station Stays (with permission, free or gold coin donation)

**POPULAR FREE SPOTS:**

🛣️ **Newcastle Waters Rest Area** (Stuart Hwy, north of Elliott) - Shady stop with picnic tables and toilets, historic township nearby

⚔️ **Attack Creek Rest Area** (north of Tennant Creek) - Historic site with basic facilities, good overnight stop on long hauls

🌳 **36 Mile Rest Area** (between Katherine and Darwin) - Common free overnight camp, toilets and shade available

🦘 **Connells Lagoon Rest Area** (Barkly Tablelands) - Remote bush rest area in flat country, good stop on long Barkly crossings

✈️ **Gorrie Airstrip** (near Roper Bar) - WWII-era airfield now big free camp, popular with caravanners and 4X4 travellers

**RESTRICTIONS:**
❌ National Parks: Require permits (Litchfield, Kakadu, Nitmiluk)
❌ Urban areas: Darwin, Alice Springs, Katherine ban free camping
❌ Aboriginal Land Trust areas: Need permits from land councils

**NT RULES:**
- Stay limits: 24-72 hours in rest areas
- Self-sufficiency: Many spots have no water/bins
- Aboriginal land respect: Permits required for access
- Fire safety: Check bans - outback burns fast in Dry season
- Leave no trace: Dumping gets access removed',
    'location_tip',
    'travel',
    8,
    true,
    'Northern Territory, Australia',
    ARRAY['northern-territory', 'nt', 'free-camping', 'rest-areas', 'outback', 'stuart-highway']
);

-- 5. Western Australia Free Camping (No State Forest Camping)
INSERT INTO public.pam_admin_knowledge (
    admin_user_id,
    title,
    content,
    knowledge_type,
    category,
    priority,
    is_active,
    location_context,
    tags
) VALUES (
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    'Western Australia Free Camping (No State Forest Camping)',
    'CRITICAL: NO free camping in WA State Forests. All managed by DBCA requiring fees and booking for designated campgrounds ($8-$12 per adult per night).

**FREE CAMPING OPTIONS:**
- 24-Hour Roadside Rest Areas (basic facilities: toilets, bins, tables)
- Council and Shire Camps (regional towns, free/donation camping)
- Crown Land and Remote Bush (unallocated Crown Land, be self-sufficient)
- Private Properties (with permission, station stays, often free/donation)

**PROVEN FREE SPOTS:**

🌊 **Galena Bridge** (near Kalbarri) - Popular roadside free camp on Murchison River, toilets and plenty of space, great fishing spot

🏞️ **Lake Poorrarecup** (near Cranbrook) - Shire-run, donation-based lakeside camp, excellent for water activities, family-friendly

⛪ **New Norcia Rest Area** (Midwest) - Near historic monastery town, basic free camp close to highway, cultural interest nearby

🏞️ **DeGrey River** (Pilbara, east of Port Hedland) - Large riverside free camp, very popular with travellers, toilets available

🌊 **Mary Pool** (between Fitzroy Crossing and Halls Creek) - Shady riverside free camp, toilets, picnic tables, good base for Kimberley trips

**OFF-LIMITS:**
❌ All State Forests (require permit and fee)
❌ National Parks (Parks Pass + nightly fees)
❌ Conservation Parks (same rules as State Forests)
❌ Urban beaches (most councils ban free camping)

**WA RULES:**
- Stay limits: 24-72 hours in rest areas
- Basic facilities: Be self-sufficient
- No trace: Rubbish dumping closes sites
- Check signage: Not all stops allow overnight stays
- Fire strict: WA rangers enforce fire bans very strictly

**FIRE SAFETY CRITICAL:**
WA has extreme fire conditions. Rangers strictly enforce fire restrictions. Always check current fire danger ratings and total fire ban status.',
    'travel_rule',
    'travel',
    8,
    true,
    'Western Australia',
    ARRAY['western-australia', 'wa', 'free-camping', 'no-state-forests', 'fire-safety', 'galena-bridge']
);

-- 6. Victoria State Forests - Best Free Camping in Australia
INSERT INTO public.pam_admin_knowledge (
    admin_user_id,
    title,
    content,
    knowledge_type,
    category,
    priority,
    is_active,
    location_context,
    tags
) VALUES (
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    'Victoria State Forests - Best Free Camping in Australia',
    'Victoria has over 3 million hectares of State Forest offering Australia''s best dispersed camping. Unlike national parks, State Forests allow camping without bookings.

**KEY BENEFITS:**
- Dispersed camping: No booking systems, pick responsible spots
- Genuine 4X4 tracks: Easy gravel to steep rutted climbs
- Multiple uses: Trail bikes, hunting, horse riding alongside camping
- Rich history: Old logging coupes and gold rush relics

**TOP CAMPING FORESTS:**

**Near Melbourne (Day Trips):**
🏔️ **Mount Disappointment State Forest** - Packed with off-road trails, closest to Melbourne
🦫 **Wombat State Forest** - 70,000ha of tracks and history, now community-managed
🌲 **Tallarook State Forest** - Easy day-trip from Melbourne with plenty of trails

**Premium Camping & 4X4:**
🏞️ **Big River State Forest** - Hotspot for campers and trail riders
💧 **Rubicon State Forest** - Logging history, waterfalls, great campsites
🌿 **Toolangi State Forest** - Rainforest pockets, famous Kalatha Giant tree

**East Gippsland:**
🏔️ **Bonang State Forest** - Straddling high country tracks towards NSW
🏖️ **Colquhoun / Boyanga Gidi State Forest** - Near Lakes Entrance (dual Indigenous name)

**Goldfields Region:**
🌊 **Gunbower State Forest** - Red gum country along Murray River, classic camping destination
🌲 **Mount Cole State Forest** - Tall eucalypt forest with maze of tracks

**Outback Experience:**
🏜️ **Big Desert State Forest** - Sand, scrub, and a real outback feel in Victoria''s far northwest

**DISPERSED CAMPING RULES:**
- No bookings required - Pick responsible spots
- Stay on designated tracks - Don''t create new ones
- Camp 20m from water sources - Protect riparian zones
- Maximum 14 days - Then move at least 50m
- Groups under 20 people - Larger groups need permits
- Check VicEmergency app for fire warnings daily

**MANAGED BY:** DEECA (Department of Energy, Environment and Climate Action)',
    'location_tip',
    'travel',
    8,
    true,
    'Victoria, Australia',
    ARRAY['victoria', 'vic', 'state-forests', 'dispersed-camping', '4wd', 'big-river', 'wombat', 'bonang']
);

-- 7. Interstate Free Camping Planning and Essential Apps
INSERT INTO public.pam_admin_knowledge (
    admin_user_id,
    title,
    content,
    knowledge_type,
    category,
    priority,
    is_active,
    location_context,
    tags
) VALUES (
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    'Interstate Free Camping Planning and Essential Apps',
    'Essential preparation for Australian interstate free camping adventures.

**ESSENTIAL APPS:**
📱 **WikiCamps Australia** - Comprehensive camping database with user reviews and ratings
📱 **iOverlander** - Global camping spots with detailed user feedback (worth $3 purchase)
📱 **Emergency Plus** - GPS coordinates for emergency services (essential for remote areas)
📱 **BOM Weather** - Bureau of Meteorology warnings and forecasts
📱 **VicEmergency/ESA apps** - State emergency services (download before travel)

**FIRE SAFETY (ALL STATES - CRITICAL):**
🔥 Check current fire danger ratings daily
🔥 Download relevant state emergency apps
🔥 Understand Total Fire Ban rules (gas cooking only)
🔥 Carry gas cooking as backup to fires
🔥 Never assume fire permissions

**WATER & SELF-SUFFICIENCY:**
💧 Minimum 4L per person per day
💧 Many free camps have no facilities
💧 Plan water resupply points on route
💧 Carry grey water containers for responsible disposal

**WASTE MANAGEMENT:**
🗑️ ''Pack it in, pack it out'' universally applied
🗑️ Many sites have no rubbish bins
🗑️ Plan waste storage and disposal strategy
🗑️ Include grey water disposal planning

**COMMUNICATIONS:**
📡 UHF radio for traveller channels (Channel 40 common)
📡 EPIRB/PLB for remote areas
📡 Satellite communicators for outback travel
📡 Mobile coverage maps for route planning

**VEHICLE PREPARATION:**
⛽ Calculate range between fuel stops
⛽ Carry extra fuel for remote area detours
⛽ Factor in extra distance to camping spots
🔧 Service cooling system (especially WA/NT heat)
🛞 Tyre pressures and spare wheel check
🛠️ Recovery gear: snatch straps, shackles, shovel
🚑 Comprehensive first aid kit and training

**EMERGENCY PROTOCOLS:**
🚨 Always inform someone of route and timing
🚨 Carry satellite communication for remote areas
🚨 Know local emergency service numbers
🚨 Understand evacuation routes in fire-prone areas

**RESPECT AND RESPONSIBILITY:**
Free camping access depends on community goodwill and responsible behaviour. Poor practices by some travellers can result in access restrictions for everyone. Always:
- Leave sites better than you found them
- Respect local communities and traditions
- Follow all signage and restrictions
- Support local businesses where possible',
    'general_knowledge',
    'travel',
    9,
    true,
    'Australia',
    ARRAY['planning', 'preparation', 'apps', 'safety', 'interstate-travel', 'wikicamps', 'fire-safety']
);

COMMIT;

-- Verify the knowledge was added successfully
SELECT
    title,
    knowledge_type,
    category,
    location_context,
    priority,
    array_length(tags, 1) as tag_count,
    created_at
FROM public.pam_admin_knowledge
WHERE title LIKE '%Australian%' OR title LIKE '%Queensland%' OR title LIKE '%Tasmania%'
   OR title LIKE '%Victoria%' OR title LIKE '%Western Australia%' OR title LIKE '%Northern Territory%'
ORDER BY created_at DESC;