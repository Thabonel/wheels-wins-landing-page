import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Alert {
  type: string;
  name?: string;
  description?: string;
  distance_miles?: number;
  alert?: string;
  urgency?: string;
  [key: string]: any;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

class ProactiveMonitor {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLon = ((lon2 - lon1) * Math.PI) / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  async getActiveUsers(): Promise<any[]> {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await this.supabase
        .from('pam_conversation_sessions')
        .select('user_id, profiles(email, region)')
        .gte('updated_at', cutoffTime)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting active users:', error);
        return [];
      }

      // Deduplicate users
      const activeUsers: Record<string, any> = {};
      for (const session of data || []) {
        const userId = session.user_id;
        if (!activeUsers[userId]) {
          activeUsers[userId] = {
            user_id: userId,
            email: session.profiles?.email || 'unknown',
            region: session.profiles?.region || 'Australia'
          };
        }
      }

      console.log(`Found ${Object.keys(activeUsers).length} active users`);
      return Object.values(activeUsers);
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  async checkNearbyAttractions(userId: string, userLocation: UserLocation): Promise<Alert[]> {
    try {
      const { lat, lon } = userLocation;
      const today = new Date().toISOString().split('T')[0];
      
      // Get local events within 50 miles
      const { data: events } = await this.supabase
        .from('local_events')
        .select('*')
        .gte('start_date', today);

      const nearbyAttractions: Alert[] = [];

      for (const event of events || []) {
        if (event.latitude && event.longitude) {
          const distance = this.calculateDistance(
            lat, lon, 
            parseFloat(event.latitude), 
            parseFloat(event.longitude)
          );
          
          if (distance <= 50) {
            nearbyAttractions.push({
              type: 'event',
              name: event.event_name,
              description: event.description || '',
              distance_miles: Math.round(distance * 10) / 10,
              start_date: event.start_date,
              location: event.address || '',
              is_free: event.is_free || false
            });
          }
        }
      }

      // Get camping locations within 30 miles
      const { data: campingLocations } = await this.supabase
        .from('camping_locations')
        .select('*');

      for (const location of campingLocations || []) {
        if (location.latitude && location.longitude) {
          const distance = this.calculateDistance(
            lat, lon,
            parseFloat(location.latitude),
            parseFloat(location.longitude)
          );
          
          if (distance <= 30) {
            nearbyAttractions.push({
              type: 'camping',
              name: location.name,
              description: `${location.type} - ${location.amenities?.description || ''}`,
              distance_miles: Math.round(distance * 10) / 10,
              price_per_night: location.price_per_night,
              rv_friendly: location.amenities?.rv_friendly || false
            });
          }
        }
      }

      // Sort by distance and return top 5
      nearbyAttractions.sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
      return nearbyAttractions.slice(0, 5);
    } catch (error) {
      console.error('Error checking nearby attractions:', error);
      return [];
    }
  }

  async monitorWeatherOnRoutes(userId: string): Promise<Alert[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: events } = await this.supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('date', today)
        .lte('date', weekFromNow);

      const weatherAlerts: Alert[] = [];

      for (const event of events || []) {
        if (event.location) {
          // Simulate weather check (would use real weather API)
          weatherAlerts.push({
            type: 'weather',
            location: event.location,
            date: event.date,
            alert: 'Possible rain expected - check road conditions',
            urgency: 'medium',
            recommendation: 'Consider waterproof gear and check alternate routes'
          });
        }
      }

      return weatherAlerts.slice(0, 3);
    } catch (error) {
      console.error('Error monitoring weather:', error);
      return [];
    }
  }

  async checkFuelPricesOnRoute(userId: string, routeCoordinates: UserLocation[]): Promise<Alert[]> {
    try {
      const { data: stations } = await this.supabase
        .from('fuel_stations')
        .select('*');

      if (!routeCoordinates.length || !stations) {
        return [];
      }

      const fuelAlerts: Alert[] = [];
      const uniqueAlerts: Record<string, Alert> = {};

      for (const coord of routeCoordinates) {
        const { latitude: lat, longitude: lon } = coord;
        
        for (const station of stations) {
          if (station.latitude && station.longitude) {
            const distance = this.calculateDistance(
              lat, lon,
              parseFloat(station.latitude),
              parseFloat(station.longitude)
            );
            
            if (distance <= 5) { // Within 5 miles of route
              const regularPrice = station.regular_price;
              
              if (regularPrice && regularPrice < 1.50) { // Good price threshold
                const key = station.station_name + station.address;
                const alert: Alert = {
                  type: 'fuel_deal',
                  station_name: station.station_name,
                  address: station.address,
                  regular_price: regularPrice,
                  diesel_price: station.diesel_price,
                  distance_from_route: Math.round(distance * 10) / 10,
                  alert: `Great fuel price: $${regularPrice}/L at ${station.station_name}`,
                  rv_friendly: station.rv_friendly || false
                };
                
                if (!uniqueAlerts[key] || regularPrice < uniqueAlerts[key].regular_price) {
                  uniqueAlerts[key] = alert;
                }
              }
            }
          }
        }
      }

      return Object.values(uniqueAlerts).slice(0, 3);
    } catch (error) {
      console.error('Error checking fuel prices:', error);
      return [];
    }
  }

  async checkVehicleMaintenance(userId: string): Promise<Alert[]> {
    try {
      const { data: records } = await this.supabase
        .from('maintenance_records')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      const maintenanceAlerts: Alert[] = [];
      const today = new Date();

      for (const record of records || []) {
        if (record.next_due_date) {
          const dueDate = new Date(record.next_due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue <= 7) { // Due within a week
            maintenanceAlerts.push({
              type: 'maintenance_due',
              task: record.task,
              due_date: record.next_due_date,
              days_until_due: daysUntilDue,
              urgency: daysUntilDue <= 3 ? 'high' : 'medium',
              alert: `${record.task} due in ${daysUntilDue} days`
            });
          }
        }

        if (record.next_due_mileage) {
          maintenanceAlerts.push({
            type: 'maintenance_mileage',
            task: record.task,
            due_mileage: record.next_due_mileage,
            urgency: 'medium',
            alert: `${record.task} - check mileage`
          });
        }
      }

      return maintenanceAlerts.slice(0, 5);
    } catch (error) {
      console.error('Error checking vehicle maintenance:', error);
      return [];
    }
  }

  async createAlertNotification(userId: string, alerts: Alert[]): Promise<boolean> {
    try {
      if (!alerts.length) return true;

      const alertSummary = {
        user_id: userId,
        alert_count: alerts.length,
        alerts,
        created_at: new Date().toISOString(),
        priority: alerts.some(alert => alert.urgency === 'high') ? 'high' : 'medium'
      };

      // In a real implementation, this would:
      // 1. Send push notification to user's device
      // 2. Create in-app notification
      // 3. Send email if urgency is high
      // 4. Store in notifications table

      console.log(`Created alert notification for user ${userId} with ${alerts.length} alerts`);
      return true;
    } catch (error) {
      console.error('Error creating alert notification:', error);
      return false;
    }
  }

  async runProactiveChecks(): Promise<any> {
    try {
      const startTime = new Date();
      const activeUsers = await this.getActiveUsers();
      
      let totalAlerts = 0;
      let processedUsers = 0;

      for (const user of activeUsers) {
        const userId = user.user_id;
        const userAlerts: Alert[] = [];

        try {
          // Sample location for demo (would get real location from user device/GPS)
          const sampleLocation: UserLocation = { latitude: -33.8688, longitude: 151.2093 }; // Sydney

          // Check nearby attractions
          const attractions = await this.checkNearbyAttractions(userId, sampleLocation);
          userAlerts.push(...attractions);

          // Monitor weather on routes
          const weatherAlerts = await this.monitorWeatherOnRoutes(userId);
          userAlerts.push(...weatherAlerts);

          // Check fuel prices
          const sampleRoute: UserLocation[] = [
            sampleLocation, 
            { latitude: -33.9, longitude: 151.3 }
          ];
          const fuelAlerts = await this.checkFuelPricesOnRoute(userId, sampleRoute);
          userAlerts.push(...fuelAlerts);

          // Check vehicle maintenance
          const maintenanceAlerts = await this.checkVehicleMaintenance(userId);
          userAlerts.push(...maintenanceAlerts);

          // Create notifications if there are alerts
          if (userAlerts.length > 0) {
            await this.createAlertNotification(userId, userAlerts);
            totalAlerts += userAlerts.length;
          }

          processedUsers++;
        } catch (error) {
          console.error(`Error processing alerts for user ${userId}:`, error);
          continue;
        }
      }

      const processingTime = (new Date().getTime() - startTime.getTime()) / 1000;

      const result = {
        success: true,
        processed_users: processedUsers,
        total_active_users: activeUsers.length,
        total_alerts_generated: totalAlerts,
        processing_time_seconds: processingTime,
        timestamp: startTime.toISOString()
      };

      console.log('Completed proactive checks:', result);
      return result;
    } catch (error) {
      console.error('Error running proactive checks:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create monitor instance
    const monitor = new ProactiveMonitor(supabase);

    // Run proactive checks
    const result = await monitor.runProactiveChecks();

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in proactive monitor function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});