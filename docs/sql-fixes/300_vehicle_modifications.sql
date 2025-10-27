CREATE TABLE IF NOT EXISTS transition_vehicle_mods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('power', 'water', 'comfort', 'safety', 'storage', 'exterior', 'other')),
    priority TEXT NOT NULL CHECK (priority IN ('essential', 'important', 'nice-to-have')) DEFAULT 'important',
    status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'complete')) DEFAULT 'planned',
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    time_required_hours INTEGER,
    diy_feasible BOOLEAN DEFAULT true,
    dependencies TEXT[],
    vendor_links JSONB DEFAULT '[]'::jsonb,
    photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    description TEXT,
    notes TEXT,
    completion_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_mods_profile ON transition_vehicle_mods(profile_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_mods_status ON transition_vehicle_mods(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_mods_category ON transition_vehicle_mods(category);

CREATE OR REPLACE FUNCTION get_vehicle_mod_stats(p_profile_id UUID)
RETURNS TABLE (
    total_mods BIGINT,
    planned_count BIGINT,
    in_progress_count BIGINT,
    complete_count BIGINT,
    total_estimated_cost DECIMAL,
    total_actual_cost DECIMAL,
    completion_percentage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_mods,
        COUNT(*) FILTER (WHERE status = 'planned')::BIGINT as planned_count,
        COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'complete')::BIGINT as complete_count,
        COALESCE(SUM(estimated_cost), 0) as total_estimated_cost,
        COALESCE(SUM(actual_cost) FILTER (WHERE status = 'complete'), 0) as total_actual_cost,
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND((COUNT(*) FILTER (WHERE status = 'complete')::DECIMAL / COUNT(*)::DECIMAL) * 100)::INTEGER
            ELSE 0
        END as completion_percentage
    FROM transition_vehicle_mods
    WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

INSERT INTO transition_vehicle_mods (profile_id, name, category, priority, status, estimated_cost, time_required_hours, diy_feasible, description)
SELECT
    tp.id,
    'Solar Panel System',
    'power',
    'essential',
    'planned',
    3500.00,
    16,
    true,
    '400W solar panel array with MPPT controller for off-grid power'
FROM transition_profiles tp
WHERE NOT EXISTS (
    SELECT 1 FROM transition_vehicle_mods
    WHERE profile_id = tp.id AND name = 'Solar Panel System'
)
LIMIT 1;

INSERT INTO transition_vehicle_mods (profile_id, name, category, priority, status, estimated_cost, time_required_hours, diy_feasible, description)
SELECT
    tp.id,
    'Water Filtration System',
    'water',
    'essential',
    'planned',
    800.00,
    8,
    true,
    'Dual-stage water filter for safe drinking water from any source'
FROM transition_profiles tp
WHERE NOT EXISTS (
    SELECT 1 FROM transition_vehicle_mods
    WHERE profile_id = tp.id AND name = 'Water Filtration System'
)
LIMIT 1;

INSERT INTO transition_vehicle_mods (profile_id, name, category, priority, status, estimated_cost, time_required_hours, diy_feasible, description)
SELECT
    tp.id,
    'Diesel Heater',
    'comfort',
    'important',
    'planned',
    1200.00,
    12,
    true,
    'Chinese diesel heater for cold weather camping'
FROM transition_profiles tp
WHERE NOT EXISTS (
    SELECT 1 FROM transition_vehicle_mods
    WHERE profile_id = tp.id AND name = 'Diesel Heater'
)
LIMIT 1;

INSERT INTO transition_vehicle_mods (profile_id, name, category, priority, status, estimated_cost, time_required_hours, diy_feasible, description)
SELECT
    tp.id,
    'MaxTrax Recovery Boards',
    'safety',
    'essential',
    'planned',
    350.00,
    1,
    false,
    'Recovery boards for getting unstuck in sand, mud, or snow'
FROM transition_profiles tp
WHERE NOT EXISTS (
    SELECT 1 FROM transition_vehicle_mods
    WHERE profile_id = tp.id AND name = 'MaxTrax Recovery Boards'
)
LIMIT 1;

INSERT INTO transition_vehicle_mods (profile_id, name, category, priority, status, estimated_cost, time_required_hours, diy_feasible, description)
SELECT
    tp.id,
    'Roof Rack System',
    'storage',
    'important',
    'planned',
    2500.00,
    20,
    false,
    'Heavy-duty roof rack for storage and rooftop tent mounting'
FROM transition_profiles tp
WHERE NOT EXISTS (
    SELECT 1 FROM transition_vehicle_mods
    WHERE profile_id = tp.id AND name = 'Roof Rack System'
)
LIMIT 1;
