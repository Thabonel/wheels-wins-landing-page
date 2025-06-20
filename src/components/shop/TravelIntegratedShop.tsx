import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useShopWheelsIntegration } from '@/lib/shopWheelsIntegration';
import { useWheels } from '@/context/WheelsContext';
import TravelProductGrid from './TravelProductGrid';
import { ShopProduct } from './types';
import { MapPin, Calendar, Wrench, Shield, Fuel } from 'lucide-react';

export default function TravelIntegratedShop() {
  const integration = useShopWheelsIntegration();
  const { state: wheelsState } = useWheels();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [smartProducts, setSmartProducts] = useState<ShopProduct[]>([]);
  const [efficiencyReport, setEfficiencyReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegratedData();
  }, []);

  const loadIntegratedData = async () => {
    setLoading(true);
    try {
      if (integration.isIntegrationEnabled()) {
        const [recs, products, report] = await Promise.all([
          integration.getTravelBasedRecommendations(),
          integration.getSmartShoppingList(),
          integration.generateTravelEfficiencyReport(),
        ]);

        setRecommendations(recs);
        setSmartProducts(products);
        setEfficiencyReport(report);
      } else {
        const products = await integration.getSmartShoppingList();
        setSmartProducts(products);
      }
    } catch (error) {
      console.error('Error loading integrated shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPurchase = async (productId: string) => {
    const product = smartProducts.find(p => p.id === productId);
    if (product) {
      await integration.trackPurchaseIntegration(productId, product);
      console.log('Product purchased:', product.title);
    }
  };

  const getRecommendationIcon = (reason: string) => {
    switch (reason) {
      case 'destination': return <MapPin className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'seasonal': return <Calendar className="w-4 h-4" />;
      case 'safety': return <Shield className="w-4 h-4" />;
      case 'efficiency': return <Fuel className="w-4 h-4" />;
      default: return null;
    }
  };

  const getRecommendationColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (!integration.isIntegrationEnabled()) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            Travel integration is disabled. Enable it in your profile settings to see personalized recommendations based on your trips.
          </AlertDescription>
        </Alert>
        
        <div>
          <h2 className="text-2xl font-bold mb-4">Shop Products</h2>
          <TravelProductGrid
            products={smartProducts}
            region="US"
            onExternalLinkClick={(url) => window.open(url, '_blank')}
            onBuyProduct={handleProductPurchase}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Travel Context */}
      {wheelsState.currentTrip && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Current Trip Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="font-semibold">{wheelsState.currentTrip.destination}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Distance</p>
                <p className="font-semibold">{wheelsState.currentTrip.distance}km</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Cost</p>
                <p className="font-semibold">${wheelsState.currentTrip.estimatedCost}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Travel-Based Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Travel-Based Recommendations</CardTitle>
            <p className="text-sm text-gray-600">
              Products recommended based on your planned trips and travel data
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getRecommendationIcon(rec.reason)}
                    <div>
                      <p className="font-medium">{rec.context}</p>
                      {rec.urgency && (
                        <p className="text-sm text-gray-600">
                          Due: {new Date(rec.urgency).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={getRecommendationColor(rec.priority)}>
                    {rec.priority} priority
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Efficiency Report */}
      {efficiencyReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="w-5 h-5" />
              Travel Efficiency Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  +{(efficiencyReport.purchaseImpact.fuelEfficiencyImprovement * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">Fuel Efficiency</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  ${efficiencyReport.purchaseImpact.maintenanceCostSavings}
                </p>
                <p className="text-sm text-gray-600">Maintenance Savings</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {(efficiencyReport.purchaseImpact.safetyComplianceScore * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-600">Safety Score</p>
              </div>
            </div>

            {efficiencyReport.productEffectiveness.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Product Effectiveness</h4>
                {efficiencyReport.productEffectiveness.map((item: any, index: number) => (
                  <p key={index} className="text-sm text-gray-600 mb-1">
                    <strong>{item.product}:</strong> {item.travelImprovement}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Smart Product Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Smart Travel Products</h2>
        <TravelProductGrid
          products={smartProducts}
          region="US"
          onExternalLinkClick={(url) => window.open(url, '_blank')}
          onBuyProduct={handleProductPurchase}
        />
      </div>
    </div>
  );
}
