
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useWheels } from '@/context/WheelsContext';
import { useWheelsIntegration } from '@/hooks/useWheelsIntegration';
import TripPlanner from '../TripPlanner';
import { AlertTriangle, Fuel, MapPin, Wrench } from 'lucide-react';

export default function TripPlannerWithIntegration() {
  const { state, actions } = useWheels();
  const { 
    validateTripReadiness, 
    calculateTripFuelPlan, 
    getMaintenanceServiceStops 
  } = useWheelsIntegration();
  
  const [fuelPlan, setFuelPlan] = useState<any>(null);
  const [serviceStops, setServiceStops] = useState<any[]>([]);
  const [tripValidation, setTripValidation] = useState<any>(null);

  useEffect(() => {
    if (state.currentTrip) {
      // Calculate fuel plan for current trip
      const plan = calculateTripFuelPlan(state.currentTrip.distance, state.currentTrip.route);
      setFuelPlan(plan);

      // Get maintenance service stops along route
      const stops = getMaintenanceServiceStops(state.currentTrip.route);
      setServiceStops(stops);

      // Validate trip readiness
      validateTripReadiness(new Date()).then(setTripValidation);
    }
  }, [state.currentTrip, calculateTripFuelPlan, getMaintenanceServiceStops, validateTripReadiness]);

  return (
    <div className="space-y-6">
      {/* Trip Validation Alert */}
      {tripValidation && !tripValidation.canTravel && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Trip Cannot Proceed:</strong> {tripValidation.blockers.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Trip Planner */}
      <TripPlanner />

      {/* Enhanced Trip Information */}
      {state.currentTrip && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fuel Planning */}
          {fuelPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="w-5 h-5" />
                  Fuel Planning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Estimated Fuel Needed</p>
                    <p className="text-lg font-semibold">{fuelPlan.estimatedLiters.toFixed(1)}L</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Cost</p>
                    <p className="text-lg font-semibold">${fuelPlan.estimatedCost.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recommended Fuel Stops</h4>
                  <div className="space-y-2">
                    {fuelPlan.recommendedStops.map((stop: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{stop.name}</p>
                          <p className="text-sm text-gray-600">{stop.distance.toFixed(0)}km from start</p>
                        </div>
                        <Badge variant="secondary">${stop.estimatedPrice.toFixed(2)}/L</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Maintenance Service Stops */}
          {serviceStops.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Maintenance Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serviceStops.map((stop, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{stop.name}</h4>
                        <Badge 
                          variant={stop.severity === 'critical' ? 'destructive' : 'secondary'}
                        >
                          {stop.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Service: {stop.service}</p>
                      <p className="text-sm text-gray-600">Distance from route: {stop.distanceFromRoute}km</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Trip Integration Summary */}
      {state.currentTrip && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Trip Integration Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{state.currentTrip.distance}km</p>
                <p className="text-sm text-gray-600">Total Distance</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {fuelPlan ? fuelPlan.recommendedStops.length : 0}
                </p>
                <p className="text-sm text-gray-600">Fuel Stops</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{serviceStops.length}</p>
                <p className="text-sm text-gray-600">Service Opportunities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
