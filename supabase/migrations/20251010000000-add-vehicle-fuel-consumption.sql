-- Comprehensive Vehicle Fuel Consumption Migration
-- Creates vehicles table if missing, then adds fuel consumption tracking
-- Idempotent: Safe to run multiple times

-- Step 1: Create vehicles table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT UNIQUE,
  license_plate TEXT,
  vehicle_type TEXT DEFAULT 'rv' CHECK (vehicle_type IN ('rv', 'motorhome', 'travel_trailer', 'fifth_wheel', 'truck', 'car', 'motorcycle', 'boat')),
  fuel_type TEXT DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid', 'propane')),
  fuel_capacity_gallons DECIMAL(6,2),
  engine_size TEXT,
  transmission TEXT,
  mileage_current INTEGER,
  mileage_purchased INTEGER,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  insurance_company TEXT,
  insurance_policy TEXT,
  insurance_expires DATE,
  registration_expires DATE,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  image_urls TEXT[],
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS if not already enabled
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'vehicles'
        AND policyname = 'Users can manage own vehicles'
    ) THEN
        CREATE POLICY "Users can manage own vehicles" ON vehicles
          FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Step 4: Create basic indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_primary ON vehicles(user_id, is_primary);

-- Step 5: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_vehicles_updated_at'
    ) THEN
        CREATE TRIGGER update_vehicles_updated_at
          BEFORE UPDATE ON vehicles
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Step 7: Add fuel consumption columns (idempotent with IF NOT EXISTS)
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS fuel_consumption_mpg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fuel_consumption_l_per_100km DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fuel_consumption_source TEXT DEFAULT 'user_provided',
ADD COLUMN IF NOT EXISTS fuel_consumption_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS fuel_consumption_sample_size INTEGER DEFAULT 0;

-- Step 8: Add constraint if column exists but constraint doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'vehicles_fuel_consumption_source_check'
    ) THEN
        ALTER TABLE vehicles
        ADD CONSTRAINT vehicles_fuel_consumption_source_check
        CHECK (fuel_consumption_source IN ('user_provided', 'calculated_from_fillups', 'manufacturer_spec'));
    END IF;
END $$;

-- Step 9: Add column comments
COMMENT ON COLUMN vehicles.fuel_consumption_mpg IS 'Miles per gallon - primary metric for US users';
COMMENT ON COLUMN vehicles.fuel_consumption_l_per_100km IS 'Liters per 100km - primary metric for international users';
COMMENT ON COLUMN vehicles.fuel_consumption_source IS 'How this fuel consumption was determined';
COMMENT ON COLUMN vehicles.fuel_consumption_last_updated IS 'When fuel consumption was last updated';
COMMENT ON COLUMN vehicles.fuel_consumption_sample_size IS 'Number of fuel log entries used for calculated average';

-- Step 10: Create fuel consumption index
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel_consumption ON vehicles(user_id, fuel_consumption_mpg) WHERE fuel_consumption_mpg IS NOT NULL;
