-- Add fuel consumption tracking to vehicles table
-- This allows PAM to store and use user-provided fuel consumption data

ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS fuel_consumption_mpg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fuel_consumption_l_per_100km DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fuel_consumption_source TEXT DEFAULT 'user_provided'
  CHECK (fuel_consumption_source IN ('user_provided', 'calculated_from_fillups', 'manufacturer_spec')),
ADD COLUMN IF NOT EXISTS fuel_consumption_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS fuel_consumption_sample_size INTEGER DEFAULT 0;

COMMENT ON COLUMN vehicles.fuel_consumption_mpg IS 'Miles per gallon - primary metric for US users';
COMMENT ON COLUMN vehicles.fuel_consumption_l_per_100km IS 'Liters per 100km - primary metric for international users';
COMMENT ON COLUMN vehicles.fuel_consumption_source IS 'How this fuel consumption was determined';
COMMENT ON COLUMN vehicles.fuel_consumption_last_updated IS 'When fuel consumption was last updated';
COMMENT ON COLUMN vehicles.fuel_consumption_sample_size IS 'Number of fuel log entries used for calculated average';

CREATE INDEX IF NOT EXISTS idx_vehicles_fuel_consumption ON vehicles(user_id, fuel_consumption_mpg) WHERE fuel_consumption_mpg IS NOT NULL;
