-- Add Avon Track as a trip template for 4WD enthusiasts
-- The Avon Track in Gippsland, Victoria

BEGIN;

-- Insert the Avon Track as a public trip template
INSERT INTO public.trip_templates (
    user_id,
    name,
    description,
    template_data,
    category,
    is_public,
    usage_count,
    tags
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID, -- System/public template
    'Avon Track - Gippsland 4WD Adventure',
    'The Avon Track in Gippsland, Victoria, is a popular four-wheel drive route that offers stunning views of the Avon River valley and surrounding landscape. Starting near Mt. Angus at the junction of Huggetts Track and Mt. Angus Track, this scenic route follows the Avon River for part of its journey before incorporating sections along Kentucky Road and Huggetts Track, ultimately ending at Wombat Crossing near Glenmaggie and Cowwarr.',
    jsonb_build_object(
        'route_type', '4wd',
        'difficulty', 'moderate',
        'distance_km', 45,
        'estimated_duration_hours', 3.5,
        'best_season', 'Spring to Autumn (September to May)',
        'vehicle_requirements', jsonb_build_array('4WD required', 'Good ground clearance', 'Recovery gear recommended'),
        'key_features', jsonb_build_array(
            'Mt. Angus starting point',
            'Avon River valley views',
            'Kentucky Road section',
            'Huggetts Track section',
            'Wombat Crossing finish'
        ),
        'waypoints', jsonb_build_array(
            jsonb_build_object(
                'name', 'Start - Mt. Angus Junction',
                'description', 'Junction of Huggetts Track and Mt. Angus Track',
                'type', 'start_point',
                'coordinates', jsonb_build_object('lat', -37.5833, 'lng', 146.8167),
                'notes', 'Check vehicle and gear before starting'
            ),
            jsonb_build_object(
                'name', 'Avon River Valley',
                'description', 'Scenic section following the Avon River',
                'type', 'scenic_point',
                'coordinates', jsonb_build_object('lat', -37.6000, 'lng', 146.8500),
                'notes', 'Great photo opportunities, watch for wildlife'
            ),
            jsonb_build_object(
                'name', 'Kentucky Road Junction',
                'description', 'Transition to Kentucky Road section',
                'type', 'waypoint',
                'coordinates', jsonb_build_object('lat', -37.6167, 'lng', 146.8833),
                'notes', 'Road surface changes, adjust driving accordingly'
            ),
            jsonb_build_object(
                'name', 'Huggetts Track Section',
                'description', 'Return to Huggetts Track',
                'type', 'waypoint',
                'coordinates', jsonb_build_object('lat', -37.6333, 'lng', 146.9167),
                'notes', 'Can be rougher terrain, take care'
            ),
            jsonb_build_object(
                'name', 'Wombat Crossing',
                'description', 'End point near Glenmaggie and Cowwarr',
                'type', 'end_point',
                'coordinates', jsonb_build_object('lat', -37.6500, 'lng', 146.9500),
                'notes', 'Track ends here, multiple exit options available'
            )
        ),
        'track_conditions', jsonb_build_object(
            'dry_weather', 'Good conditions, suitable for most 4WDs',
            'wet_weather', 'Can become slippery and challenging, experienced drivers only',
            'seasonal_closures', 'Check with Parks Victoria for any seasonal closures'
        ),
        'safety_notes', jsonb_build_array(
            'Always travel with another vehicle when possible',
            'Carry recovery gear (snatch straps, shovel, etc.)',
            'UHF radio recommended for communication',
            'Mobile phone coverage is limited',
            'Inform someone of your travel plans',
            'Carry plenty of water and food',
            'Check weather conditions before departure'
        ),
        'permits_required', 'No specific permits required, but check current regulations',
        'camping_options', jsonb_build_array(
            'Bush camping allowed in designated areas',
            'Nearby campgrounds at Glenmaggie',
            'Facilities limited along the track'
        ),
        'nearby_attractions', jsonb_build_array(
            'Lake Glenmaggie',
            'Avon River',
            'Mt. Angus lookout',
            'Historic mining sites',
            'Native wildlife viewing'
        ),
        'contact_info', jsonb_build_object(
            'emergency', '000',
            'parks_victoria', '13 1963',
            'local_visitor_info', 'Wellington Visitor Information Centre'
        )
    ),
    'offroad',
    true, -- Make it publicly available
    0,
    ARRAY['4wd', 'offroad', 'gippsland', 'victoria', 'avon-river', 'scenic', 'adventure']
);

-- Create a more detailed standalone tracks table for future expansion
CREATE TABLE IF NOT EXISTS public.offroad_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    region TEXT NOT NULL,
    track_type TEXT CHECK (track_type IN ('4wd', 'motorbike', 'atv', 'mixed')),
    difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'difficult', 'extreme')),
    length_km DECIMAL(6,2),
    duration_hours DECIMAL(5,2),
    description TEXT,
    detailed_route JSONB,
    conditions JSONB,
    requirements JSONB,
    safety_info JSONB,
    coordinates GEOGRAPHY(LINESTRING, 4326),
    start_point GEOGRAPHY(POINT, 4326),
    end_point GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_verified BOOLEAN DEFAULT false,
    popularity_score INTEGER DEFAULT 0,
    tags TEXT[]
);

-- Enable RLS
ALTER TABLE public.offroad_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view tracks" ON public.offroad_tracks
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tracks" ON public.offroad_tracks
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own tracks" ON public.offroad_tracks
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own tracks" ON public.offroad_tracks
    FOR DELETE USING (auth.uid() = created_by);

-- Insert Avon Track into the dedicated tracks table
INSERT INTO public.offroad_tracks (
    name,
    state,
    region,
    track_type,
    difficulty,
    length_km,
    duration_hours,
    description,
    detailed_route,
    conditions,
    requirements,
    safety_info,
    tags,
    is_verified
) VALUES (
    'Avon Track',
    'Victoria',
    'Gippsland',
    '4wd',
    'moderate',
    45,
    3.5,
    'The Avon Track in Gippsland, Victoria, is a popular four-wheel drive route starting near Mt. Angus at the junction of Huggetts Track and Mt. Angus Track. It follows the Avon River valley offering stunning views, includes sections along Kentucky Road and Huggetts Track, and ends at Wombat Crossing near Glenmaggie and Cowwarr.',
    jsonb_build_object(
        'segments', jsonb_build_array(
            jsonb_build_object(
                'name', 'Mt. Angus to Avon River',
                'distance_km', 12,
                'description', 'Starting segment from the junction near Mt. Angus down to the Avon River valley'
            ),
            jsonb_build_object(
                'name', 'Avon River Valley',
                'distance_km', 15,
                'description', 'Scenic section following the Avon River with multiple viewpoints'
            ),
            jsonb_build_object(
                'name', 'Kentucky Road Section',
                'distance_km', 10,
                'description', 'Transition through Kentucky Road with varied terrain'
            ),
            jsonb_build_object(
                'name', 'Huggetts Track to Wombat Crossing',
                'distance_km', 8,
                'description', 'Final section along Huggetts Track ending at Wombat Crossing'
            )
        )
    ),
    jsonb_build_object(
        'dry', 'Generally good conditions suitable for most 4WD vehicles with decent clearance',
        'wet', 'Can become very slippery and challenging, recommended for experienced drivers only',
        'seasonal', 'Best traveled in dry conditions from September to May',
        'current', 'Always check with Parks Victoria for current track conditions and closures'
    ),
    jsonb_build_object(
        'vehicle', jsonb_build_array('4WD vehicle essential', 'Good ground clearance', 'All-terrain tyres recommended'),
        'equipment', jsonb_build_array('Recovery gear', 'Snatch straps', 'Shovel', 'Tyre deflation kit', 'Air compressor'),
        'supplies', jsonb_build_array('Extra water', 'Food supplies', 'First aid kit', 'Maps/GPS', 'UHF radio'),
        'experience', 'Moderate 4WD experience recommended'
    ),
    jsonb_build_object(
        'communication', 'Limited mobile coverage - UHF radio essential',
        'travel_plan', 'Always inform someone of your intended route and return time',
        'group_travel', 'Recommended to travel with at least one other vehicle',
        'emergency', 'Emergency services: 000. Nearest towns: Glenmaggie, Cowwarr',
        'hazards', jsonb_build_array('River crossings in wet weather', 'Steep sections', 'Loose rocks', 'Tree hazards')
    ),
    ARRAY['4wd', 'gippsland', 'avon-river', 'mt-angus', 'kentucky-road', 'huggetts-track', 'wombat-crossing', 'scenic', 'victoria'],
    true -- Mark as verified since this is official information
);

-- Create indexes for better search performance
CREATE INDEX idx_offroad_tracks_state ON public.offroad_tracks(state);
CREATE INDEX idx_offroad_tracks_region ON public.offroad_tracks(region);
CREATE INDEX idx_offroad_tracks_difficulty ON public.offroad_tracks(difficulty);
CREATE INDEX idx_offroad_tracks_tags ON public.offroad_tracks USING GIN(tags);
CREATE INDEX idx_offroad_tracks_start_point ON public.offroad_tracks USING GIST(start_point);
CREATE INDEX idx_offroad_tracks_end_point ON public.offroad_tracks USING GIST(end_point);

-- Add trigger for updated_at
CREATE TRIGGER update_offroad_tracks_updated_at
    BEFORE UPDATE ON public.offroad_tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;