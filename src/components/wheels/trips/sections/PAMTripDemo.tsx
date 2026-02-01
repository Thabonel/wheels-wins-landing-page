import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, Edit3, Play, Share2, Trash2 } from 'lucide-react';

/**
 * Demo component showcasing PAM trip editing UI enhancements
 * This demonstrates the visual indicators and editing features
 */
export default function PAMTripDemo() {
  const demoTrips = [
    {
      id: '1',
      title: 'Melbourne to Adelaide Coastal Drive',
      description: 'A scenic coastal route with wine tastings and beach stops [PAM AI Generated]',
      metadata: {
        created_by: 'pam_ai',
        distance: 732000,
        duration: 28800
      },
      status: 'planning',
      updated_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      title: 'Sydney to Brisbane Weekend Trip',
      description: 'Quick weekend getaway along the Pacific Highway',
      metadata: {
        created_by: 'user',
        distance: 920000,
        duration: 36000
      },
      status: 'active',
      updated_at: '2024-01-14T14:20:00Z'
    }
  ];

  const isPAMTrip = (trip: any) => {
    return trip.metadata?.created_by === 'pam_ai' ||
           trip.description?.includes('[PAM AI Generated]');
  };

  const getTripCreatorInfo = (trip: any) => {
    if (isPAMTrip(trip)) {
      return {
        icon: Bot,
        label: 'PAM AI',
        color: 'bg-purple-100 text-purple-800',
        description: 'AI-generated trip plan'
      };
    }
    return {
      icon: User,
      label: 'Manual',
      color: 'bg-blue-100 text-blue-800',
      description: 'User-created trip'
    };
  };

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(0)} km`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">PAM Trip Editing UI Demo</h2>
        <p className="text-gray-600">
          Showcasing enhanced trip cards with PAM indicators and editing capabilities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {demoTrips.map((trip) => (
          <Card key={trip.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{trip.title}</CardTitle>
                    {(() => {
                      const creatorInfo = getTripCreatorInfo(trip);
                      const IconComponent = creatorInfo.icon;
                      return (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${creatorInfo.color}`}>
                          <IconComponent className="w-3 h-3" />
                          <span>{creatorInfo.label}</span>
                        </div>
                      );
                    })()}
                  </div>
                  {trip.description && (
                    <p className="text-sm text-gray-600 mt-1">{trip.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {trip.status && (
                    <Badge variant={
                      trip.status === 'completed' ? 'default' :
                      trip.status === 'active' ? 'secondary' :
                      'outline'
                    }>
                      {trip.status}
                    </Badge>
                  )}
                  {isPAMTrip(trip) && (
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                      PAM Enhanced
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {trip.metadata && (
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    Distance: {formatDistance(trip.metadata.distance)}
                  </div>
                  <div>
                    Duration: {formatDuration(trip.metadata.duration)}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Updated {new Date(trip.updated_at).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => console.log('Load trip:', trip.title)}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Load
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => console.log('Edit trip:', trip.title)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="Edit this trip"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => console.log('Share trip:', trip.title)}
                  title="Share trip link"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => console.log('Delete trip:', trip.title)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Delete trip"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Key Features Demonstrated:</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>• <strong>PAM Trip Identification:</strong> Purple "PAM AI" badges and "PAM Enhanced" indicators</li>
          <li>• <strong>Visual Differentiation:</strong> Color-coded creator labels (PAM vs Manual)</li>
          <li>• <strong>Enhanced Edit Button:</strong> Dedicated edit icon with blue styling</li>
          <li>• <strong>Improved Layout:</strong> Better spacing and visual hierarchy</li>
          <li>• <strong>Status Indicators:</strong> Trip status badges with appropriate colors</li>
          <li>• <strong>Tooltip Support:</strong> Helpful tooltips on action buttons</li>
        </ul>
      </div>
    </div>
  );
}