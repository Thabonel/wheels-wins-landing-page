
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWheels } from '@/context/WheelsContext';
import { useWheelsIntegration } from '@/hooks/useWheelsIntegration';
import { AlertTriangle, CheckCircle, Wrench, Package, Shield, Fuel } from 'lucide-react';

export default function WheelsIntegrationDashboard() {
  const { state } = useWheels();
  const { 
    validateTripReadiness, 
    integrateStorageWithSafety, 
    isValidatingTrip 
  } = useWheelsIntegration();
  
  const [tripValidation, setTripValidation] = useState<any>(null);
  const [safetyIntegration, setSafetyIntegration] = useState<any>(null);

  useEffect(() => {
    // Update safety integration when storage data changes
    const safetyData = integrateStorageWithSafety();
    setSafetyIntegration(safetyData);
  }, [state.safetyRequirements, integrateStorageWithSafety]);

  const handleValidateTrip = async () => {
    if (state.currentTrip) {
      const validation = await validateTripReadiness(new Date());
      setTripValidation(validation);
    }
  };

  const getStatusColor = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Travel Readiness Dashboard</h2>
        <Button 
          onClick={handleValidateTrip}
          disabled={!state.currentTrip || isValidatingTrip}
          className="flex items-center gap-2"
        >
          <Shield className="w-4 h-4" />
          {isValidatingTrip ? 'Validating...' : 'Validate Trip Readiness'}
        </Button>
      </div>

      {/* Current Trip Status */}
      {state.currentTrip && (
        <Card>
          <CardHeader>
            <CardTitle>
              Current Trip: {state.currentTrip.origin} → {state.currentTrip.destination}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Distance</p>
                <p className="text-lg font-semibold">{state.currentTrip.distance}km</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Fuel</p>
                <p className="text-lg font-semibold">{state.currentTrip.estimatedFuelNeeded.toFixed(1)}L</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Cost</p>
                <p className="text-lg font-semibold">${state.currentTrip.estimatedCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Validation Results */}
      {tripValidation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(tripValidation.canTravel ? 'good' : 'error')}
              Trip Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tripValidation.blockers.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Trip Blocked:</strong>
                  <ul className="mt-2 ml-4 list-disc">
                    {tripValidation.blockers.map((blocker: string, index: number) => (
                      <li key={index}>{blocker}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {tripValidation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings:</strong>
                  <ul className="mt-2 ml-4 list-disc">
                    {tripValidation.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {tripValidation.recommendations.length > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>Recommendations:</strong>
                  <ul className="mt-2 ml-4 list-disc">
                    {tripValidation.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Maintenance Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{state.maintenanceAlerts.length}</span>
              <Badge variant={state.maintenanceAlerts.some(a => a.severity === 'critical') ? 'destructive' : 'secondary'}>
                {state.maintenanceAlerts.some(a => a.severity === 'critical') ? 'Critical' : 'OK'}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mt-1">Active alerts</p>
          </CardContent>
        </Card>

        {/* Safety Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Safety Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safetyIntegration && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {safetyIntegration.safetyStatus.verified}/{safetyIntegration.safetyStatus.totalRequired}
                  </span>
                  <Badge variant={safetyIntegration.safetyStatus.missing > 0 ? 'destructive' : 'secondary'}>
                    {safetyIntegration.safetyStatus.missing === 0 ? 'Complete' : 'Missing'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">Verified items</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Storage Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safetyIntegration && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{safetyIntegration.safetyStatus.inStorage}</span>
                  <Badge variant="secondary">Tracked</Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">Safety items stored</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fuel Efficiency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Fuel Economy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{state.fuelEfficiency}</span>
              <Badge variant="secondary">L/100km</Badge>
            </div>
            <p className="text-xs text-gray-600 mt-1">Current efficiency</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      {safetyIntegration?.actionItems && safetyIntegration.actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {safetyIntegration.actionItems.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {item.type === 'acquire' ? 'Acquire' : 'Verify'}: {item.item}
                    </p>
                  </div>
                  <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'}>
                    {item.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
