-- Add best_season column to trip_templates table
-- This column helps users know the optimal time to take each trip

-- Add the column
ALTER TABLE public.trip_templates 
ADD COLUMN IF NOT EXISTS best_season TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN public.trip_templates.best_season IS 'Optimal travel season for this trip (e.g., "April to October", "Year round")';

-- Update existing templates with best_season data based on their content
-- Great Ocean Road - temperate climate, avoid winter storms
UPDATE public.trip_templates 
SET best_season = 'October to April'
WHERE name ILIKE '%Great Ocean Road%' AND best_season IS NULL;

-- Red Centre/Uluru - avoid extreme summer heat
UPDATE public.trip_templates 
SET best_season = 'April to September'
WHERE (name ILIKE '%Red Centre%' OR name ILIKE '%Uluru%') AND best_season IS NULL;

-- Pacific Coast - avoid wet season in far north
UPDATE public.trip_templates 
SET best_season = 'April to October'
WHERE name ILIKE '%Pacific Coast%' AND best_season IS NULL;

-- Big Lap - complex, depends on regional planning
UPDATE public.trip_templates 
SET best_season = 'Plan by region - avoid extreme seasons'
WHERE (name ILIKE '%Big Lap%' OR name ILIKE '%Around Australia%') AND best_season IS NULL;

-- Western Australia - avoid extreme summer heat
UPDATE public.trip_templates 
SET best_season = 'April to September'
WHERE (name ILIKE '%Western Australia%' OR template_data->>'region' ILIKE '%Western Australia%') AND best_season IS NULL;

-- Nullarbor - avoid summer heat, winter storms
UPDATE public.trip_templates 
SET best_season = 'April to October'
WHERE name ILIKE '%Nullarbor%' AND best_season IS NULL;

-- Queensland Outback - dry season preferred
UPDATE public.trip_templates 
SET best_season = 'April to September'
WHERE (name ILIKE '%Queensland Outback%' OR name ILIKE '%Queensland%Trail%') AND best_season IS NULL;

-- Blue Mountains - avoid extreme weather
UPDATE public.trip_templates 
SET best_season = 'September to May'
WHERE name ILIKE '%Blue Mountains%' AND best_season IS NULL;

-- Bayfield National Park - dry season for 4WD access
UPDATE public.trip_templates 
SET best_season = 'April to October'
WHERE name ILIKE '%Bayfield%' AND best_season IS NULL;

-- Victorian High Country - summer/autumn for mountain access
UPDATE public.trip_templates 
SET best_season = 'November to April'
WHERE (name ILIKE '%Victorian High Country%' OR name ILIKE '%High Country%') AND best_season IS NULL;

-- Gibb River Road - dry season only (road closed in wet season)
UPDATE public.trip_templates 
SET best_season = 'May to September'
WHERE name ILIKE '%Gibb River%' AND best_season IS NULL;

-- Murray River - year round but best in warmer months
UPDATE public.trip_templates 
SET best_season = 'October to April'
WHERE name ILIKE '%Murray River%' AND best_season IS NULL;

-- Tasmania - avoid winter weather
UPDATE public.trip_templates 
SET best_season = 'November to April'
WHERE (name ILIKE '%Tasmania%' OR name ILIKE '%Tassie%') AND best_season IS NULL;

-- East Coast - avoid cyclone season in north
UPDATE public.trip_templates 
SET best_season = 'April to October'
WHERE name ILIKE '%East Coast%' AND best_season IS NULL;

-- Savannah Way - dry season for remote areas
UPDATE public.trip_templates 
SET best_season = 'May to September'
WHERE name ILIKE '%Savannah Way%' AND best_season IS NULL;

-- Southwest WA - avoid winter rains and summer heat
UPDATE public.trip_templates 
SET best_season = 'October to April'
WHERE (name ILIKE '%Southwest%' AND name ILIKE '%WA%') AND best_season IS NULL;

-- Wine regions - harvest season and good weather
UPDATE public.trip_templates 
SET best_season = 'February to May, September to November'
WHERE (name ILIKE '%Wine%' OR description ILIKE '%wine%') AND best_season IS NULL;

-- Coastal routes - generally avoid winter storms
UPDATE public.trip_templates 
SET best_season = 'October to April'
WHERE (category = 'coastal_routes' OR name ILIKE '%coast%') AND best_season IS NULL;

-- 4WD adventures - dry season for track access
UPDATE public.trip_templates 
SET best_season = 'April to October'
WHERE category = '4wd_adventures' AND best_season IS NULL;

-- Mountain routes - avoid snow season
UPDATE public.trip_templates 
SET best_season = 'November to April'
WHERE (category = 'mountain' OR name ILIKE '%mountain%' OR name ILIKE '%alpine%') AND best_season IS NULL;

-- Outback routes - avoid extreme heat
UPDATE public.trip_templates 
SET best_season = 'April to September'
WHERE (category ILIKE '%outback%' OR description ILIKE '%outback%') AND best_season IS NULL;

-- Default fallback for any remaining templates
UPDATE public.trip_templates 
SET best_season = 'Year round (check regional conditions)'
WHERE best_season IS NULL;

-- Create index for better performance on season-based queries
CREATE INDEX IF NOT EXISTS idx_trip_templates_best_season ON public.trip_templates(best_season);

-- Add RLS policy if needed (assuming existing policies cover this)
-- The best_season column should be readable by the same users who can read trip_templates