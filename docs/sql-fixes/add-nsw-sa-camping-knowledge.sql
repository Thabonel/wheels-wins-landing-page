BEGIN;

-- 1. New South Wales Free Camping Rules and Locations
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
    'New South Wales Free Camping Rules and Locations',
    'CRITICAL NSW CAMPING RULES:

**STATE FORESTS - Free Camping IS Allowed:**
Forestry Corporation NSW manages State Forests where dispersed camping is generally permitted unless signed otherwise. Popular areas include Clyde State Forest, Mogo State Forest, Bodalla State Forest (all South Coast inland), Watagan State Forest (Hunter Valley), and Pilliga State Forest (northwest NSW).

**NATIONAL PARKS - Dogs PROHIBITED:**
Dogs are PROHIBITED in ALL NSW National Parks and Nature Reserves. This includes all walking tracks, camping areas, and day-use areas. Fines apply. The only exceptions are assistance animals and some specific trails designated by NPWS.

**REST AREAS - Time Limits Vary:**
NSW rest area time limits are set by individual signage and vary by location. Common limits are 20 hours, NOT a universal 24 hours. Always check the sign at each rest area for the specific time limit. Princes Highway rest areas between Kiama and Bega have varying limits.

**SOUTH COAST SPECIFICS (Kiama to Bega region):**
- Tilba Tilba is a small heritage village with NO legal free camping
- Bermagui wharf/Dickinson Point is NOT a legal free camp - council actively patrols
- Tathra wharf area is NOT a legal free camp
- South Coast councils (Eurobodalla, Bega Valley) actively fine illegal campers ($110+ fines)
- "Informal camping" at beaches, wharves, or town areas is illegal and fined

**LEGAL FREE/LOW-COST ALTERNATIVES (South Coast):**
- Clyde State Forest (inland from Batemans Bay) - free dispersed camping
- Mogo State Forest (inland from Moruya) - free dispersed camping
- Bodalla State Forest (inland from Narooma) - free dispersed camping
- Designated rest areas on Princes Highway (check signage for time limits)
- Council caravan parks offer unpowered sites from $20-30/night

**ESSENTIAL TOOLS:**
- WikiCamps Australia app for current verified free camp locations and user reviews
- NSW National Parks app for park info and bookings
- Forestry Corporation NSW website for State Forest access and closures

**GENERAL NSW RULES:**
- Always check local council regulations - rules change and fines apply
- Fire restrictions are enforced strictly, especially during summer
- Self-contained vehicles have more options
- Leave No Trace principles mandatory
- Stay limits typically 24-72 hours in rest areas (check signage)',
    'travel_rule',
    'travel',
    8,
    true,
    'New South Wales, Australia',
    ARRAY['new-south-wales', 'nsw', 'free-camping', 'rules', 'south-coast', 'state-forests', 'dogs-prohibited-national-parks']
);

-- 2. South Australia Free Camping Rules and Locations
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
    'South Australia Free Camping Rules and Locations',
    'CRITICAL SA CAMPING RULES:

**NO FREE CAMPING in SA State Forests or National Parks.**
All SA parks and forests require paid permits. SA National Parks are managed by DEW (Department for Environment and Water) and all require entry fees and camping permits booked through parks.sa.gov.au.

**FREE CAMPING OPTIONS:**
- Regional rest areas along major highways (check signage for time limits)
- Council free camps in regional towns (many Outback towns welcome travellers)
- Coorong area rest stops along the Princes Highway
- Murray River access points (some council-managed free areas)
- Remote pastoral areas (with station owner permission)

**POPULAR FREE/LOW-COST AREAS:**
- Blanchetown free camp (Murray River, basic facilities)
- Lameroo rest area (Mallee region, toilets available)
- Kimba rest area (Eyre Highway, good stopover)
- Port Augusta foreshore (council free camp, time-limited)
- Various Outback roadside stops along Stuart Highway

**FIRE SAFETY - EXTREME RISK:**
SA has extreme fire conditions, especially in:
- Adelaide Hills and Mount Lofty Ranges
- Fleurieu Peninsula
- Kangaroo Island
- Mid North grain belt areas
Always check CFS (Country Fire Service) for total fire ban days. Gas cooking only during total fire bans. Campfires banned in many areas during fire danger season (November-April).

**SA RULES:**
- All National Parks require paid permits - no exceptions
- State Forests also require permits
- Council free camps may have time limits (check signage)
- Dog restrictions vary by park and council area - always check before travelling with pets
- Water is scarce in many SA camping areas - carry minimum 4L per person per day
- Check current council regulations - rules change and fines apply',
    'travel_rule',
    'travel',
    8,
    true,
    'South Australia',
    ARRAY['south-australia', 'sa', 'free-camping', 'rules', 'locations']
);

COMMIT;

SELECT
    title,
    knowledge_type,
    location_context,
    priority,
    array_length(tags, 1) as tag_count,
    created_at
FROM public.pam_admin_knowledge
WHERE title LIKE '%New South Wales%' OR title LIKE '%South Australia%'
ORDER BY created_at DESC;
