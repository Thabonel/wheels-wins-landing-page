-- Add seasonal migration knowledge for Australian Grey Nomads to PAM
-- Enables PAM to answer questions about when/where to travel seasonally
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Australian Seasonal Migration Overview
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
    'Australian Grey Nomad Seasonal Migration Overview',
    'Australian Grey Nomads (retirees travelling in caravans/motorhomes) follow predictable seasonal patterns driven by climate:

**THE BASIC PATTERN:**
- WINTER (May-September): Head NORTH to Queensland, NT, WA - warm dry season
- SUMMER (October-April): Head SOUTH to Victoria, Tasmania, SA - escape tropical heat/wet

**PEAK MIGRATION TIMING:**
- April-May: Mass exodus from southern states heading north ("the grey army moves north")
- September-October: Return south as Top End heats up and wet season approaches

**WHY SEASONAL TRAVEL MATTERS:**
- Avoid extreme heat (40C+ in central/northern Australia in summer)
- Avoid wet season (Nov-Apr in tropical north - roads flood, parks close)
- Avoid cold southern winters (frost, short days, closed mountain passes)
- Save money on long-stay park rates during shoulder seasons
- Attend major events timed to seasonal patterns

**BUDGET CONSIDERATIONS:**
- Long-stay parks offer 20-30% discount for monthly bookings
- Typical monthly park rate: $600-$1,200 depending on location and facilities
- Free camps and rest areas available on all major corridors
- Fuel costs: budget $150-$300/week depending on vehicle and distance
- Peak season parks book out months ahead - plan early for popular spots

**DEMOGRAPHIC NOTES:**
- Most Grey Nomads are 55-80 years old
- Many travel 3-9 months per year
- Typical rig: caravan or motorhome (not tent camping)
- Self-sufficiency valued - solar panels, water tanks, satellite TV common
- Community-oriented - convoy travel, park social events, online forums',
    'general_knowledge',
    'travel',
    9,
    true,
    'Australia',
    ARRAY['seasonal', 'migration', 'grey-nomad', 'snowbird', 'overview', 'australia']
);

-- 2. East Coast Corridor (Pacific Highway)
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
    'East Coast Corridor - Pacific Highway Seasonal Migration',
    'The Pacific Highway (now M1/A1) is Australia''s busiest Grey Nomad migration corridor, running Brisbane-Sydney-Melbourne along the coast.

**NORTHBOUND (Autumn - April/May):**
- Depart Melbourne/Sydney late April to mid-May
- Avoid departing before mid-April (still hot in northern NSW)
- Key stops: Port Macquarie, Coffs Harbour, Byron Bay, Gold Coast
- Destination: Southeast QLD (Hervey Bay, Bundaberg, Rockhampton)
- Travel time: 2-4 weeks if stopping regularly

**SOUTHBOUND (Spring - September/October):**
- Depart QLD late September to mid-October
- Beat the school holiday rush (December-January)
- Key stops: same corridor in reverse
- Arrive southern states by November for warm summer

**KEY LONG-STAY PARKS ON CORRIDOR:**
- Hervey Bay: popular winter base, whale watching Jul-Oct, many monthly-rate parks
- Port Macquarie: mild year-round, mid-coast stopping point
- Coffs Harbour: banana country, good facilities, moderate climate
- Forster-Tuncurry: quiet alternative to Port Macquarie
- Lakes Entrance (VIC): summer base, fishing, Gippsland Lakes

**MONTHLY RATES (APPROXIMATE):**
- Budget parks: $600-$800/month (powered site)
- Mid-range parks: $800-$1,000/month (ensuite or cabin)
- Premium parks: $1,000-$1,400/month (resort-style facilities)

**WEATHER WINDOWS:**
- Best northbound window: Late April to mid-May (25-30C in northern NSW)
- Best southbound window: Late September to mid-October (warming nicely in VIC/NSW)
- Avoid: January-March in QLD (cyclone risk, extreme heat, wet season flooding)',
    'location_tip',
    'travel',
    8,
    true,
    'New South Wales, Queensland, Victoria, Australia',
    ARRAY['seasonal', 'migration', 'grey-nomad', 'east-coast', 'pacific-highway', 'corridor', 'brisbane', 'sydney', 'melbourne']
);

-- 3. Inland Route (Newell/New England Highways)
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
    'Inland Route - Newell and New England Highway Migration',
    'The Newell Highway (Melbourne to Brisbane via inland NSW) and New England Highway offer cooler alternatives to the Pacific Highway coast route.

**NEWELL HIGHWAY (HWY 39):**
- Melbourne - Shepparton - Dubbo - Moree - Goondiwindi - Brisbane
- Australia''s longest highway (1,060km)
- Flatter terrain, easier towing, less traffic than M1
- Farming country - grain silos, cotton fields, sheep stations

**KEY STOPS:**
- Shepparton (VIC): Fruit bowl region, good parks
- Dubbo (NSW): Taronga Western Plains Zoo, excellent mid-point
- Coonamble/Lightning Ridge: Opal country, unique outback experience
- Moree: Hot artesian baths (free!), good winter stopover
- Goondiwindi: Border town, cotton country

**NEW ENGLAND HIGHWAY:**
- Sydney - Tamworth - Armidale - Tenterfield - Brisbane
- Higher altitude (cooler in summer, colder in winter)
- Best for: Summer travel southbound (avoids coastal humidity)

**ADVANTAGES OVER COASTAL ROUTE:**
- Less traffic, fewer caravans competing for spots
- Cheaper fuel and park rates (country prices)
- More free camping options (rest areas, showgrounds)
- Authentic Australian country town experience
- Better for wide/heavy rigs (straighter roads)

**BEST TIMING:**
- Northbound: April-May (cooling nicely, harvest season atmosphere)
- Southbound: September-October (wildflowers, spring lambs)
- Avoid winter on New England (frost, fog on tablelands)

**MONTHLY RATES:**
- Inland parks generally $100-$200 cheaper per month than coastal
- Many showgrounds offer weekly rates ($100-$150/week)
- Free camps abundant - Wikicamps app essential',
    'location_tip',
    'travel',
    8,
    true,
    'New South Wales, Victoria, Queensland, Australia',
    ARRAY['seasonal', 'migration', 'grey-nomad', 'inland', 'newell-highway', 'new-england', 'corridor', 'dubbo', 'tamworth']
);

-- 4. Northern Migration (QLD/NT Dry Season)
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
    'Northern Migration - Queensland and NT Dry Season',
    'The Top End (NT/Far North QLD) has a strict seasonal window: the Dry Season (May-September). Outside this window, roads flood, parks close, and conditions become dangerous.

**THE DRY SEASON WINDOW:**
- May: Roads opening, early season - less crowded, some tracks still wet
- June-July: Peak season - perfect weather, everything open, most crowded
- August: Still excellent, events season (Garma Festival, Darwin Festival)
- September: Getting hot, late season - crowds thinning, last chance

**KEY DESTINATIONS:**
- Darwin: Base camp for Top End, markets, waterfront
- Kakadu National Park: Iconic waterfalls, rock art, wildlife (best Jun-Aug)
- Litchfield National Park: Swimming holes, easier access than Kakadu
- Katherine Gorge (Nitmiluk): Spectacular gorge system, cruises and walks
- Broome (WA border): Cable Beach, pearling history, Staircase to the Moon

**CAPE YORK (Far North QLD):**
- Very limited window: June-October only
- 4WD essential - no caravans past Cooktown
- Book Jardine River ferry well ahead
- Camping only - no caravan parks on the track

**TRAVEL TIPS:**
- Book Darwin/Kakadu parks by March for peak season
- Carry extra water and fuel (remote stretches 200-400km between stops)
- Check road conditions daily: ntlis.nt.gov.au/roadreport
- Respect Aboriginal land protocols - permits needed for some areas
- Crocodile safety: NEVER swim in unmarked waterways

**COSTS:**
- Fuel expensive north of Tennant Creek ($2.50-$3.00/L)
- Park fees in Kakadu: $40/adult entrance + camping fees
- Darwin caravan parks: $50-$70/night, monthly rates $1,200-$1,600
- Free camps exist on Stuart Highway but limited in national parks

**WET SEASON (November-April) - DO NOT TRAVEL:**
- Roads flood and close (Stuart Highway can close for days)
- Extreme humidity (35C+ with 80-90% humidity)
- Cyclone risk (Category 3-5 cyclones possible)
- Most tourist operations close
- Dangerous wildlife more active (crocs, box jellyfish)',
    'location_tip',
    'travel',
    9,
    true,
    'Northern Territory, Queensland, Australia',
    ARRAY['seasonal', 'migration', 'grey-nomad', 'top-end', 'dry-season', 'darwin', 'kakadu', 'broome', 'corridor']
);

-- 5. Western Australia Migration
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
    'Western Australia Seasonal Migration - Perth to Broome Corridor',
    'The Perth-Broome corridor (Indian Ocean Drive / Brand Highway / North West Coastal Highway) is one of Australia''s great migration routes, spanning 2,200km of coastline.

**NORTHBOUND (April-June):**
- Depart Perth late April to May
- Wildflower season in Midwest (July-October) - time departure accordingly
- Key stops: Geraldton, Carnarvon, Exmouth, Karratha
- Arrive Broome by June for peak dry season

**SOUTHBOUND (September-October):**
- Leave Broome by late September (getting very hot)
- Arrive Perth region October-November for WA summer
- Alternatively: cross to NT via Great Northern Highway

**KEY DESTINATIONS:**
- Geraldton: Windsurfing capital, good parks, lobster season
- Shark Bay/Monkey Mia: Dolphins, stromatolites (World Heritage)
- Exmouth/Ningaloo Reef: Whale sharks (March-July), snorkelling
- Karratha/Dampier: Mining town amenities, Burrup Peninsula rock art
- Broome: Cable Beach, camel rides, pearl farms, Staircase to the Moon

**CYCLONE SEASON WARNING (November-April):**
- Tropical cyclones affect coast north of Exmouth
- Infrastructure damage can close roads for weeks
- Insurance may not cover cyclone damage to caravans
- DO NOT be north of Geraldton during cyclone season

**WILDFLOWER SEASON (July-October):**
- One of WA''s biggest drawcards for Grey Nomads
- Midwest and Goldfields regions peak July-September
- Coastal heath near Kalbarri peak August-September
- Plan timing to coincide for spectacular displays

**COSTS:**
- Fuel: Very expensive north of Carnarvon ($2.20-$2.80/L)
- Parks: Exmouth/Broome peak season $50-$80/night
- Monthly rates available in Geraldton/Carnarvon ($800-$1,200)
- Free camps: Good options south of Carnarvon, limited further north
- National park fees: WA Parks Pass $15/vehicle (covers most parks)',
    'location_tip',
    'travel',
    8,
    true,
    'Western Australia',
    ARRAY['seasonal', 'migration', 'grey-nomad', 'western-australia', 'perth', 'broome', 'exmouth', 'corridor', 'wildflowers', 'cyclone']
);

-- 6. Long-Stay Park Intelligence
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
    'Long-Stay Park Intelligence for Grey Nomads',
    'Guide to finding and booking long-stay (monthly rate) caravan parks across Australia.

**WHAT IS A LONG-STAY PARK?**
- Parks offering discounted rates for stays of 28+ days
- Typically 20-30% cheaper than nightly rates
- Some parks are long-stay only (permanent residents + travellers)
- Others have a mix of tourist and long-stay sites

**POPULAR LONG-STAY REGIONS BY SEASON:**

**WINTER (May-Sep) - Northern Bases:**
- Hervey Bay, QLD: Whale watching, mild 20-25C, many monthly parks
- Cairns region, QLD: Tropical but dry, reef access
- Darwin area, NT: Dry season paradise, markets, culture
- Broome, WA: Cable Beach, iconic sunsets, pearl culture
- Typical monthly rate: $800-$1,400

**SUMMER (Oct-Apr) - Southern Bases:**
- Murray River region (Echuca/Moama, Mildura): Riverfront, warm, relaxed
- Gippsland Lakes, VIC: Fishing, boating, mild coast climate
- Adelaide Hills/Barossa, SA: Wine country, cooler altitude
- Margaret River, WA: Wine, surf, forests, premium but worth it
- Typical monthly rate: $700-$1,200

**HOW TO FIND MONTHLY RATES:**
- Call parks directly - monthly rates often not advertised online
- Ask for "long-stay" or "monthly" rates specifically
- Booking.com/Google rarely show monthly options
- WikiCamps app: Filter for "long term" in amenities
- Big4, Discovery Parks, Top Tourist chains all offer monthly rates
- Discount cards: G''Day Rewards, Lifestyle Villages

**BOOKING TIPS:**
- Book 2-3 months ahead for peak season in popular areas
- Shoulder season (Apr/Oct) offers best value - fewer crowds, cheaper rates
- Ask about power inclusion - some monthly rates exclude power ($5-$10/day extra)
- Check internet - remote parks may have poor mobile coverage
- Ask about mail collection/forwarding for long stays

**TYPICAL MONTHLY COSTS BREAKDOWN:**
- Park fees: $600-$1,400/month
- Power (if separate): $100-$200/month
- Fuel for local trips: $100-$200/month
- Food/groceries: $400-$600/month
- Entertainment/dining: $200-$400/month
- Total: $1,400-$2,800/month for comfortable travel',
    'general_knowledge',
    'travel',
    8,
    true,
    'Australia',
    ARRAY['seasonal', 'migration', 'grey-nomad', 'long-stay', 'monthly-rate', 'caravan-park', 'budget', 'accommodation']
);

-- 7. Seasonal Events Calendar
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
    'Grey Nomad Seasonal Events Calendar',
    'Major events that Grey Nomads plan their migrations around. These events book out parks months ahead.

**JANUARY:**
- Tamworth Country Music Festival (NSW) - Last full week of January
  Book parks 6+ months ahead, entire region full
  Alternative: camp at nearby showgrounds

**MARCH-APRIL:**
- Melbourne Grand Prix (VIC) - March
- Sydney Royal Easter Show (NSW) - March/April
- Barossa Vintage Festival (SA) - Odd-numbered years, April

**MAY-JUNE:**
- Whale season begins Hervey Bay (QLD) - May onwards
- Gibb River Road opens (WA/Kimberley) - Usually May
- Dry season begins Top End - Parks start filling

**JULY:**
- Camel Cup (Alice Springs, NT) - Mid-July
  Quirky outback event, book Alice parks early
- Cairns Festival (QLD) - Late July
- Darwin Beer Can Regatta (NT) - July
  Boats made from beer cans race - truly Australian

**AUGUST:**
- Birdsville Races (QLD) - First weekend September (book by August)
  6,000 people descend on a town of 140 - camp on the floodplain
- Garma Festival (Arnhem Land, NT) - August
  Indigenous cultural festival, limited tickets
- Mt Isa Rodeo (QLD) - August
  Southern hemisphere''s largest rodeo
- Henley-on-Todd Regatta (Alice Springs, NT) - August
  Boat race on a dry riverbed

**SEPTEMBER:**
- Birdsville Races (QLD) - First weekend
- AFL Grand Final (Melbourne, VIC) - Late September
  City buzzing, good atmosphere even without tickets
- Wildflower season peaks (WA Midwest) - September

**OCTOBER:**
- Bathurst 1000 (NSW) - October long weekend
  Book parks in Orange/Bathurst region 12 months ahead
- Melbourne Cup Carnival (VIC) - First Tuesday November (build-up October)

**NOVEMBER-DECEMBER:**
- Sydney to Hobart preparations (TAS) - December
- Christmas/New Year: All coastal parks fully booked
  Must book by August for December-January in popular areas

**PLANNING TIP:** Build your migration route around 2-3 key events, then fill in travel between them. Events create natural deadlines for arrival timing.',
    'general_knowledge',
    'travel',
    8,
    true,
    'Australia',
    ARRAY['seasonal', 'migration', 'grey-nomad', 'events', 'calendar', 'birdsville', 'tamworth', 'festivals']
);

-- 8. Weather Windows by Corridor
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
    'Weather Windows by Corridor - Month by Month Travel Guide',
    'Optimal travel windows for each major Australian migration corridor by month.

**JANUARY:**
- Southern VIC/TAS: Warm 20-30C, long days, great for coast - GO
- Northern QLD/NT: Wet season, humid 35C+, cyclone risk - AVOID
- WA north of Geraldton: Cyclone risk, extreme heat - AVOID
- Inland NSW: Very hot 35-45C - AVOID unless in mountains

**FEBRUARY-MARCH:**
- Southern states: Still warm, good beach weather - GO
- Tropical north: Peak wet season, roads flooding - AVOID
- SA/VIC wine regions: Harvest season, warm 25-35C - GO

**APRIL:**
- Southeast QLD: Cooling to 25C, perfect weather starting - GO
- Top End NT: Wet season ending, humidity dropping - WAIT
- Southern states: Autumn colours, 15-25C - GO (last month before cold)

**MAY:**
- Northern QLD: Dry season starting, 25-28C, beautiful - GO
- Top End NT: Dry season confirmed, roads reopening - GO
- Southern VIC/TAS: Getting cold 8-15C, short days - LEAVING TIME
- WA: Heading north window opens - GO

**JUNE-JULY:**
- Top End NT: Perfect 20-30C, 0% humidity, blue skies - PEAK
- North QLD: Dry, warm, whale season starting - PEAK
- Kimberley WA: Dry, accessible, spectacular - PEAK
- Southern states: Cold 5-15C, frost, rain - AVOID for caravans

**AUGUST:**
- Same as June-July for northern areas - PEAK continues
- Events season in outback (Birdsville, Mt Isa) - PEAK
- Southern states: Still cold, spring approaching - WAIT

**SEPTEMBER:**
- Top End: Getting hot 35C+, last month - LEAVING SOON
- Mid-NSW/QLD: Warming nicely 20-28C - GO
- Southern VIC: Spring arriving 15-20C - RETURNING TIME
- WA Midwest: Wildflower peak - GO

**OCTOBER:**
- Southern states: Spring 18-25C, wildflowers - GO
- Northern QLD: Getting hot and humid - LEAVE
- NT: Pre-wet buildup, uncomfortable - LEAVE
- Inland NSW: Pleasant 20-28C window - GO

**NOVEMBER-DECEMBER:**
- Southern coast: Summer arriving 22-30C - GO
- Tropical north: Wet season starting - AVOID
- All coastal parks booking out for holidays - BOOK EARLY

**FIRE SEASON WARNING:**
- VIC/NSW/SA: November-March high fire danger
- Check CFA/RFS apps daily
- Have evacuation plan at every park
- Keep vehicle fuelled and packed for quick departure

**TEMPERATURE GUIDE (Comfortable Caravan Range):**
- Ideal: 18-28C (not too hot for sleeping, not too cold for outdoor living)
- Too hot: Above 35C (aircon struggles in caravans, solar panels less efficient)
- Too cold: Below 10C overnight (condensation issues, gas heating costs increase)',
    'general_knowledge',
    'travel',
    9,
    true,
    'Australia',
    ARRAY['seasonal', 'migration', 'grey-nomad', 'weather', 'weather-windows', 'temperature', 'corridor', 'monthly-guide']
);

COMMIT;

-- Verify the seasonal knowledge was added
SELECT
    title,
    knowledge_type,
    category,
    location_context,
    priority,
    array_length(tags, 1) as tag_count,
    created_at
FROM public.pam_admin_knowledge
WHERE 'seasonal' = ANY(tags)
ORDER BY created_at DESC;
