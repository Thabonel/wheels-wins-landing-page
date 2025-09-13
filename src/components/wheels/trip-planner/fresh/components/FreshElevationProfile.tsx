import React from 'react';
import { TrendingUp, Mountain, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ElevationProfile {
  totalClimb: number;
  totalDescent: number;
  maxGradient: number;
  averageGradient: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  elevationPoints: Array<{
    distance: number;
    elevation: number;
  }>;
}

interface FreshElevationProfileProps {
  isOpen: boolean;
  onClose: () => void;
  elevation: ElevationProfile | null;
  vehicleType?: string;
}

const FreshElevationProfile: React.FC<FreshElevationProfileProps> = ({
  isOpen,
  onClose,
  elevation,
  vehicleType = 'Standard Vehicle'
}) => {
  if (!isOpen || !elevation) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Advanced': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Expert': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'Expert': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'Advanced': return <Mountain className="w-4 h-4 text-orange-600" />;
      default: return <TrendingUp className="w-4 h-4 text-green-600" />;
    }
  };

  const getVehicleRecommendations = (difficulty: string, maxGradient: number, vehicleType: string) => {
    const recommendations = [];
    
    if (maxGradient > 10) {
      if (vehicleType.toLowerCase().includes('unimog')) {
        recommendations.push({
          type: 'gear',
          text: 'Engage low range gearing for steep sections',
          icon: '⚙️'
        });
        recommendations.push({
          type: 'diff',
          text: 'Consider diff lock activation on challenging terrain',
          icon: '🔒'
        });
      } else if (vehicleType.toLowerCase().includes('4wd')) {
        recommendations.push({
          type: 'gear',
          text: 'Use low range for steep descents and climbs',
          icon: '⚙️'
        });
        recommendations.push({
          type: 'traction',
          text: 'Enable 4WD mode for better traction',
          icon: '🔧'
        });
      } else {
        recommendations.push({
          type: 'caution',
          text: 'Exercise caution on steep gradients',
          icon: '⚠️'
        });
      }
    }

    if (difficulty === 'Expert') {
      if (vehicleType.toLowerCase().includes('unimog')) {
        recommendations.push({
          type: 'braking',
          text: 'Use engine braking on steep descents',
          icon: '🛑'
        });
        recommendations.push({
          type: 'tires',
          text: 'Consider lowering tire pressure for better traction',
          icon: '🛞'
        });
      } else {
        recommendations.push({
          type: 'alternative',
          text: 'Consider alternative route if vehicle not suitable',
          icon: '↩️'
        });
      }
    }

    return recommendations;
  };

  // Create elevation chart SVG path
  const createElevationPath = (points: Array<{ distance: number; elevation: number }>) => {
    if (points.length < 2) return '';

    const width = 400;
    const height = 150;
    const padding = 20;

    const maxDistance = Math.max(...points.map(p => p.distance));
    const minElevation = Math.min(...points.map(p => p.elevation));
    const maxElevation = Math.max(...points.map(p => p.elevation));
    const elevationRange = maxElevation - minElevation || 100; // Avoid division by zero

    const pathPoints = points.map(point => {
      const x = padding + (point.distance / maxDistance) * (width - 2 * padding);
      const y = padding + ((maxElevation - point.elevation) / elevationRange) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return `M ${pathPoints.join(' L ')}`;
  };

  const elevationPath = createElevationPath(elevation.elevationPoints);
  const vehicleRecommendations = getVehicleRecommendations(elevation.difficulty, elevation.maxGradient, vehicleType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Mountain className="w-5 h-5" />
            Elevation & Terrain Analysis
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Difficulty Badge */}
          <div className="flex items-center gap-3 mb-6">
            {getDifficultyIcon(elevation.difficulty)}
            <Badge 
              variant="outline" 
              className={`text-sm font-medium ${getDifficultyColor(elevation.difficulty)}`}
            >
              {elevation.difficulty} Difficulty
            </Badge>
            <span className="text-gray-600 text-sm">for {vehicleType}</span>
          </div>

          {/* Elevation Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{elevation.totalClimb}m</div>
                <div className="text-sm text-gray-600">Total Climb</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{elevation.totalDescent}m</div>
                <div className="text-sm text-gray-600">Total Descent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{elevation.maxGradient}%</div>
                <div className="text-sm text-gray-600">Max Gradient</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{elevation.averageGradient}%</div>
                <div className="text-sm text-gray-600">Avg Gradient</div>
              </CardContent>
            </Card>
          </div>

          {/* Elevation Profile Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Elevation Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-50 rounded-lg p-4">
                <svg width="100%" height="200" viewBox="0 0 400 150" className="w-full">
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="20" height="15" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 15" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Elevation path */}
                  {elevationPath && (
                    <>
                      {/* Area fill */}
                      <path
                        d={`${elevationPath} L 380,130 L 20,130 Z`}
                        fill="url(#elevationGradient)"
                        opacity="0.3"
                      />
                      {/* Line */}
                      <path
                        d={elevationPath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}
                  
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="elevationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                    </linearGradient>
                  </defs>
                </svg>
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Start</span>
                  <span>Distance along route</span>
                  <span>End</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle-Specific Recommendations */}
          {vehicleRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Vehicle Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vehicleRecommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg">{rec.icon}</span>
                      <div>
                        <div className="font-medium text-sm capitalize">{rec.type}</div>
                        <div className="text-gray-600 text-sm">{rec.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Terrain Difficulty Explanation */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mountain className="w-5 h-5" />
                Difficulty Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                    Beginner
                  </Badge>
                  <span className="text-gray-600">Flat roads, minimal elevation changes (&lt;5% grade)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                    Intermediate
                  </Badge>
                  <span className="text-gray-600">Rolling hills, moderate climbs (5-10% grade)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
                    Advanced
                  </Badge>
                  <span className="text-gray-600">Steep terrain, significant elevation (10-15% grade)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                    Expert
                  </Badge>
                  <span className="text-gray-600">Extreme gradients, challenging terrain (&gt;15% grade)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Elevation analysis based on route terrain and your vehicle type
          </div>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FreshElevationProfile;