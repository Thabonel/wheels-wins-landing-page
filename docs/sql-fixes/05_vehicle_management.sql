-- Vehicle Management Migration
-- Vehicle tracking, maintenance, and fuel logging

-- Vehicles table
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

-- Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('oil_change', 'tire_rotation', 'brake_service', 'transmission_service', 'coolant_flush', 'air_filter', 'fuel_filter', 'spark_plugs', 'battery', 'inspection', 'repair', 'upgrade', 'other')),
  description TEXT NOT NULL,
  service_provider TEXT,
  location TEXT,
  cost DECIMAL(8,2),
  currency TEXT DEFAULT 'USD',
  mileage_at_service INTEGER,
  date DATE NOT NULL,
  next_service_mileage INTEGER,
  next_service_date DATE,
  parts_replaced TEXT[],
  labor_hours DECIMAL(4,2),
  warranty_info TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel log
CREATE TABLE IF NOT EXISTS fuel_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id UUID, -- Reference to user_trips if part of a trip
  gallons DECIMAL(6,3) NOT NULL,
  cost_per_gallon DECIMAL(6,3),
  total_cost DECIMAL(8,2),
  currency TEXT DEFAULT 'USD',
  fuel_type TEXT DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'propane')),
  octane_rating INTEGER,
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  station_name TEXT,
  mileage INTEGER,
  miles_since_last_fillup INTEGER,
  mpg_calculated DECIMAL(5,2),
  is_full_tank BOOLEAN DEFAULT true,
  payment_method TEXT,
  receipt_url TEXT,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle expenses (non-fuel, non-maintenance)
CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('insurance', 'registration', 'parking', 'tolls', 'storage', 'financing', 'other')),
  description TEXT NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  vendor TEXT,
  expense_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'annually')),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service reminders
CREATE TABLE IF NOT EXISTS service_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  description TEXT NOT NULL,
  due_mileage INTEGER,
  due_date DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Users can manage own vehicles" ON vehicles
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for maintenance_records
CREATE POLICY "Users can manage own maintenance records" ON maintenance_records
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for fuel_log
CREATE POLICY "Users can manage own fuel log" ON fuel_log
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for vehicle_expenses
CREATE POLICY "Users can manage own vehicle expenses" ON vehicle_expenses
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for service_reminders
CREATE POLICY "Users can manage own service reminders" ON service_reminders
  FOR ALL USING (auth.uid() = user_id);

-- Apply updated_at triggers
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fuel_log_updated_at
  BEFORE UPDATE ON fuel_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_expenses_updated_at
  BEFORE UPDATE ON vehicle_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_reminders_updated_at
  BEFORE UPDATE ON service_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_primary ON vehicles(user_id, is_primary);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_user_id ON maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON maintenance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_type ON maintenance_records(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_date ON maintenance_records(vehicle_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_fuel_log_user_id ON fuel_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_vehicle_id ON fuel_log(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_logged_at ON fuel_log(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_log_vehicle_logged ON fuel_log(vehicle_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_log_trip_id ON fuel_log(trip_id) WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_user_id ON vehicle_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle_id ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_date ON vehicle_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_type ON vehicle_expenses(expense_type);

CREATE INDEX IF NOT EXISTS idx_service_reminders_user_id ON service_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_service_reminders_vehicle_id ON service_reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_reminders_due_date ON service_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_service_reminders_completed ON service_reminders(is_completed);

-- Spatial indexes for fuel log locations
CREATE INDEX IF NOT EXISTS idx_fuel_log_location ON fuel_log USING GIST(location);

-- Partial indexes for active/pending reminders
CREATE INDEX IF NOT EXISTS idx_service_reminders_pending ON service_reminders(user_id, due_date) WHERE is_completed = false;