/**
 * Trip Tools Implementation
 * Functions for retrieving trip data, vehicle information, and fuel records
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// ===================
// TYPE DEFINITIONS
// ===================

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_location: {
    address: string;
    coordinates: [number, number]; // [lng, lat]
  };
  end_location: {
    address: string;
    coordinates: [number, number];
  };
  start_time: string;
  end_time?: string;
  trip_type: 'business' | 'personal' | 'commute' | 'leisure';
  distance_miles: number;
  cost_breakdown: {
    fuel_cost: number;
    tolls: number;
    parking: number;
    other: number;
    total: number;
  };
  vehicle_id?: string;
  created_at: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  license_plate?: string;
  vin?: string;
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  fuel_tank_capacity?: number;
  avg_mpg?: number;
  maintenance: {
    last_service_date?: string;
    next_service_due?: string;
    mileage: number;
    service_history: Array<{
      date: string;
      type: string;
      cost: number;
      mileage: number;
      notes?: string;
    }>;
  };
  insurance: {
    provider?: string;
    policy_number?: string;
    expiry_date?: string;
    coverage_type?: string;
  };
  is_primary: boolean;
  created_at: string;
}

export interface FuelRecord {
  id: string;
  user_id: string;
  vehicle_id?: string;
  date: string;
  location: {
    station_name: string;
    address: string;
    coordinates?: [number, number];
  };
  fuel_type: string;
  gallons: number;
  price_per_gallon: number;
  total_cost: number;
  odometer_reading?: number;
  trip_id?: string;
  payment_method?: string;
  created_at: string;
}

export interface TripPlan {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  planned_date: string;
  destinations: Array<{
    name: string;
    address: string;
    coordinates?: [number, number];
    estimated_duration?: number;
  }>;
  estimated_distance: number;
  estimated_cost: {
    fuel: number;
    tolls: number;
    accommodation?: number;
    total: number;
  };
  vehicle_id?: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ===================
// TRIP FUNCTIONS
// ===================

/**
 * Get user's trip history with filtering options
 */
export async function getTripHistory(
  userId: string,
  options: {
    start_date?: string;
    end_date?: string;
    trip_type?: 'business' | 'personal' | 'commute' | 'leisure' | 'all';
    include_costs?: boolean;
    include_fuel_data?: boolean;
    limit?: number;
  } = {}
): Promise<ToolResponse<Trip[]>> {
  try {
    logger.debug('Getting trip history', { userId, options });

    let query = supabase
      .from('trips')
      .select(`
        *,
        vehicles (
          make,
          model,
          year
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false });

    // Apply date filtering
    if (options.start_date) {
      query = query.gte('start_time', options.start_date);
    }
    if (options.end_date) {
      query = query.lte('start_time', options.end_date);
    }

    // Apply trip type filtering
    if (options.trip_type && options.trip_type !== 'all') {
      query = query.eq('trip_type', options.trip_type);
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }

    const { data: trips, error } = await query;

    if (error) {
      logger.error('Error fetching trip history', error);
      return {
        success: false,
        error: 'Failed to fetch trips',
        message: 'Could not retrieve your trip history. Please try again.'
      };
    }

    if (!trips || trips.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No trips found for the specified criteria.'
      };
    }

    // Process and format trips
    const formattedTrips: Trip[] = trips.map(trip => ({
      id: trip.id,
      user_id: trip.user_id,
      title: trip.title || `Trip to ${trip.end_location?.address || 'destination'}`,
      description: trip.description,
      start_location: trip.start_location || { address: 'Unknown', coordinates: [0, 0] },
      end_location: trip.end_location || { address: 'Unknown', coordinates: [0, 0] },
      start_time: trip.start_time,
      end_time: trip.end_time,
      trip_type: trip.trip_type || 'personal',
      distance_miles: trip.distance_miles || 0,
      cost_breakdown: trip.cost_breakdown || {
        fuel_cost: 0,
        tolls: 0,
        parking: 0,
        other: 0,
        total: 0
      },
      vehicle_id: trip.vehicle_id,
      created_at: trip.created_at,
      status: trip.status
    }));

    // Add fuel data if requested
    if (options.include_fuel_data) {
      for (const trip of formattedTrips) {
        const fuelData = await getFuelDataForTrip(trip.id);
        if (fuelData.success && fuelData.data) {
          trip.cost_breakdown.fuel_cost = fuelData.data.reduce(
            (sum, record) => sum + record.total_cost, 
            0
          );
        }
      }
    }

    logger.debug('Successfully retrieved trip history', { 
      userId, 
      tripCount: formattedTrips.length 
    });

    return {
      success: true,
      data: formattedTrips,
      message: `Retrieved ${formattedTrips.length} trip(s) successfully`
    };

  } catch (error) {
    logger.error('Unexpected error in getTripHistory', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'An unexpected error occurred while retrieving your trips.'
    };
  }
}

/**
 * Get user's vehicle data
 */
export async function getVehicleData(
  userId: string,
  options: {
    vehicle_id?: string;
    include_maintenance?: boolean;
    include_insurance?: boolean;
    include_performance?: boolean;
  } = {}
): Promise<ToolResponse<Vehicle | Vehicle[]>> {
  try {
    logger.debug('Getting vehicle data', { userId, options });

    let query = supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId);

    // Filter by specific vehicle if requested
    if (options.vehicle_id) {
      query = query.eq('id', options.vehicle_id);
    }

    const { data: vehicles, error } = await query;

    if (error) {
      logger.error('Error fetching vehicle data', error);
      return {
        success: false,
        error: 'Failed to fetch vehicles',
        message: 'Could not retrieve your vehicle information. Please try again.'
      };
    }

    if (!vehicles || vehicles.length === 0) {
      return {
        success: true,
        data: options.vehicle_id ? undefined : [],
        message: 'No vehicles found.'
      };
    }

    // Format vehicle data
    const formattedVehicles: Vehicle[] = vehicles.map(vehicle => ({
      id: vehicle.id,
      user_id: vehicle.user_id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      license_plate: vehicle.license_plate,
      vin: vehicle.vin,
      fuel_type: vehicle.fuel_type || 'gasoline',
      fuel_tank_capacity: vehicle.fuel_tank_capacity,
      avg_mpg: vehicle.avg_mpg,
      maintenance: vehicle.maintenance || {
        mileage: 0,
        service_history: []
      },
      insurance: vehicle.insurance || {},
      is_primary: vehicle.is_primary || false,
      created_at: vehicle.created_at
    }));

    // Add performance data if requested
    if (options.include_performance) {
      for (const vehicle of formattedVehicles) {
        const performanceData = await getVehiclePerformance(vehicle.id);
        if (performanceData.success) {
          vehicle.avg_mpg = performanceData.data?.avg_mpg || vehicle.avg_mpg;
        }
      }
    }

    // Return single vehicle if specific ID was requested
    if (options.vehicle_id) {
      const vehicle = formattedVehicles[0];
      return {
        success: true,
        data: vehicle,
        message: 'Vehicle information retrieved successfully'
      };
    }

    logger.debug('Successfully retrieved vehicle data', { 
      userId, 
      vehicleCount: formattedVehicles.length 
    });

    return {
      success: true,
      data: formattedVehicles,
      message: `Retrieved ${formattedVehicles.length} vehicle(s) successfully`
    };

  } catch (error) {
    logger.error('Unexpected error in getVehicleData', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'An unexpected error occurred while retrieving vehicle data.'
    };
  }
}

/**
 * Get fuel consumption and cost data
 */
export async function getFuelData(
  userId: string,
  options: {
    dateRange?: DateRange;
    vehicle_id?: string;
    include_stations?: boolean;
    include_efficiency?: boolean;
    analysis_type?: 'cost_summary' | 'efficiency_trends' | 'station_comparison' | 'monthly_breakdown' | 'all';
  } = {}
): Promise<ToolResponse<{
  records: FuelRecord[];
  summary?: {
    total_cost: number;
    total_gallons: number;
    average_price_per_gallon: number;
    records_count: number;
  };
  efficiency?: {
    avg_mpg: number;
    best_mpg: number;
    worst_mpg: number;
  };
  stations?: Array<{
    name: string;
    visit_count: number;
    avg_price: number;
    total_spent: number;
  }>;
}>> {
  try {
    logger.debug('Getting fuel data', { userId, options });

    let query = supabase
      .from('fuel_records')
      .select(`
        *,
        vehicles (
          make,
          model,
          year
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Apply date range filtering
    if (options.dateRange) {
      query = query
        .gte('date', options.dateRange.start_date)
        .lte('date', options.dateRange.end_date);
    }

    // Filter by vehicle
    if (options.vehicle_id) {
      query = query.eq('vehicle_id', options.vehicle_id);
    }

    const { data: fuelRecords, error } = await query;

    if (error) {
      logger.error('Error fetching fuel data', error);
      return {
        success: false,
        error: 'Failed to fetch fuel data',
        message: 'Could not retrieve your fuel records. Please try again.'
      };
    }

    if (!fuelRecords || fuelRecords.length === 0) {
      return {
        success: true,
        data: {
          records: [],
          summary: {
            total_cost: 0,
            total_gallons: 0,
            average_price_per_gallon: 0,
            records_count: 0
          }
        },
        message: 'No fuel records found for the specified criteria.'
      };
    }

    // Format fuel records
    const formattedRecords: FuelRecord[] = fuelRecords.map(record => ({
      id: record.id,
      user_id: record.user_id,
      vehicle_id: record.vehicle_id,
      date: record.date,
      location: record.location || {
        station_name: 'Unknown Station',
        address: 'Unknown Location'
      },
      fuel_type: record.fuel_type || 'Regular',
      gallons: record.gallons || 0,
      price_per_gallon: record.price_per_gallon || 0,
      total_cost: record.total_cost || 0,
      odometer_reading: record.odometer_reading,
      trip_id: record.trip_id,
      payment_method: record.payment_method,
      created_at: record.created_at
    }));

    // Calculate summary
    const totalCost = formattedRecords.reduce((sum, record) => sum + record.total_cost, 0);
    const totalGallons = formattedRecords.reduce((sum, record) => sum + record.gallons, 0);
    const averagePricePerGallon = totalGallons > 0 ? totalCost / totalGallons : 0;

    const summary = {
      total_cost: totalCost,
      total_gallons: totalGallons,
      average_price_per_gallon: averagePricePerGallon,
      records_count: formattedRecords.length
    };

    const responseData: any = {
      records: formattedRecords,
      summary
    };

    // Add efficiency analysis if requested
    if (options.include_efficiency) {
      const mpgData = await calculateFuelEfficiency(formattedRecords);
      responseData.efficiency = mpgData;
    }

    // Add station analysis if requested
    if (options.include_stations) {
      const stationData = calculateStationAnalysis(formattedRecords);
      responseData.stations = stationData;
    }

    logger.debug('Successfully retrieved fuel data', { 
      userId, 
      recordCount: formattedRecords.length,
      totalCost 
    });

    return {
      success: true,
      data: responseData,
      message: `Retrieved ${formattedRecords.length} fuel record(s) successfully`
    };

  } catch (error) {
    logger.error('Unexpected error in getFuelData', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'An unexpected error occurred while retrieving fuel data.'
    };
  }
}

/**
 * Get upcoming trip plans
 */
export async function getTripPlans(
  userId: string,
  options: {
    limit?: number;
    include_estimates?: boolean;
  } = {}
): Promise<ToolResponse<TripPlan[]>> {
  try {
    logger.debug('Getting trip plans', { userId, options });

    let query = supabase
      .from('trip_plans')
      .select('*')
      .eq('user_id', userId)
      .gte('planned_date', new Date().toISOString())
      .order('planned_date', { ascending: true });

    if (options.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }

    const { data: tripPlans, error } = await query;

    if (error) {
      logger.error('Error fetching trip plans', error);
      return {
        success: false,
        error: 'Failed to fetch trip plans',
        message: 'Could not retrieve your trip plans. Please try again.'
      };
    }

    if (!tripPlans || tripPlans.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No upcoming trip plans found.'
      };
    }

    // Format trip plans
    const formattedPlans: TripPlan[] = tripPlans.map(plan => ({
      id: plan.id,
      user_id: plan.user_id,
      title: plan.title,
      description: plan.description,
      planned_date: plan.planned_date,
      destinations: plan.destinations || [],
      estimated_distance: plan.estimated_distance || 0,
      estimated_cost: plan.estimated_cost || {
        fuel: 0,
        tolls: 0,
        total: 0
      },
      vehicle_id: plan.vehicle_id,
      status: plan.status || 'draft',
      created_at: plan.created_at
    }));

    logger.debug('Successfully retrieved trip plans', { 
      userId, 
      planCount: formattedPlans.length 
    });

    return {
      success: true,
      data: formattedPlans,
      message: `Retrieved ${formattedPlans.length} trip plan(s) successfully`
    };

  } catch (error) {
    logger.error('Unexpected error in getTripPlans', error);
    return {
      success: false,
      error: 'Unexpected error',
      message: 'An unexpected error occurred while retrieving trip plans.'
    };
  }
}

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Get fuel data for a specific trip
 */
async function getFuelDataForTrip(tripId: string): Promise<ToolResponse<FuelRecord[]>> {
  try {
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('trip_id', tripId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: 'Failed to get fuel data for trip' };
  }
}

/**
 * Get vehicle performance metrics
 */
async function getVehiclePerformance(vehicleId: string): Promise<ToolResponse<{ avg_mpg: number }>> {
  try {
    // Calculate MPG from fuel records and odometer readings
    const { data: records } = await supabase
      .from('fuel_records')
      .select('gallons, odometer_reading')
      .eq('vehicle_id', vehicleId)
      .not('odometer_reading', 'is', null)
      .order('date', { ascending: true });

    if (!records || records.length < 2) {
      return { success: true, data: { avg_mpg: 0 } };
    }

    // Calculate average MPG from consecutive records
    let totalMpg = 0;
    let mpgCount = 0;

    for (let i = 1; i < records.length; i++) {
      const prevRecord = records[i - 1];
      const currentRecord = records[i];
      
      if (prevRecord.odometer_reading && currentRecord.odometer_reading && currentRecord.gallons) {
        const miles = currentRecord.odometer_reading - prevRecord.odometer_reading;
        const mpg = miles / currentRecord.gallons;
        
        if (mpg > 0 && mpg < 100) { // Reasonable MPG range
          totalMpg += mpg;
          mpgCount++;
        }
      }
    }

    const avgMpg = mpgCount > 0 ? totalMpg / mpgCount : 0;

    return { success: true, data: { avg_mpg: Math.round(avgMpg * 10) / 10 } };
  } catch {
    return { success: true, data: { avg_mpg: 0 } };
  }
}

/**
 * Calculate fuel efficiency from records
 */
async function calculateFuelEfficiency(records: FuelRecord[]) {
  const recordsWithOdometer = records.filter(r => r.odometer_reading);
  
  if (recordsWithOdometer.length < 2) {
    return { avg_mpg: 0, best_mpg: 0, worst_mpg: 0 };
  }

  const mpgValues: number[] = [];
  
  for (let i = 1; i < recordsWithOdometer.length; i++) {
    const prev = recordsWithOdometer[i - 1];
    const current = recordsWithOdometer[i];
    
    if (prev.odometer_reading && current.odometer_reading && current.gallons) {
      const miles = current.odometer_reading - prev.odometer_reading;
      const mpg = miles / current.gallons;
      
      if (mpg > 0 && mpg < 100) {
        mpgValues.push(mpg);
      }
    }
  }

  if (mpgValues.length === 0) {
    return { avg_mpg: 0, best_mpg: 0, worst_mpg: 0 };
  }

  return {
    avg_mpg: Math.round((mpgValues.reduce((a, b) => a + b, 0) / mpgValues.length) * 10) / 10,
    best_mpg: Math.round(Math.max(...mpgValues) * 10) / 10,
    worst_mpg: Math.round(Math.min(...mpgValues) * 10) / 10
  };
}

/**
 * Calculate gas station usage analysis
 */
function calculateStationAnalysis(records: FuelRecord[]) {
  const stationMap = new Map<string, {
    visit_count: number;
    total_cost: number;
    total_gallons: number;
  }>();

  records.forEach(record => {
    const stationName = record.location.station_name;
    
    if (!stationMap.has(stationName)) {
      stationMap.set(stationName, {
        visit_count: 0,
        total_cost: 0,
        total_gallons: 0
      });
    }

    const station = stationMap.get(stationName)!;
    station.visit_count++;
    station.total_cost += record.total_cost;
    station.total_gallons += record.gallons;
  });

  return Array.from(stationMap.entries()).map(([name, data]) => ({
    name,
    visit_count: data.visit_count,
    avg_price: data.total_gallons > 0 ? Math.round((data.total_cost / data.total_gallons) * 100) / 100 : 0,
    total_spent: Math.round(data.total_cost * 100) / 100
  })).sort((a, b) => b.visit_count - a.visit_count);
}

export default {
  getTripHistory,
  getVehicleData,
  getFuelData,
  getTripPlans
};