import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  MapPin, 
  Calendar,
  Import,
  Search,
  Globe
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function SharedTrips() {
  const { user } = useAuth();
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [communityTrips, setCommunityTrips] = useState([]);

  const handleImportTrip = async () => {
    if (!shareCode.trim()) {
      toast.error('Please enter a share code');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement share code import
      toast.info('Import functionality coming soon!');
    } catch (error) {
      toast.error('Failed to import trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Import className="w-5 h-5" />
            Import Shared Trip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter share code or URL"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleImportTrip} disabled={loading}>
              <Import className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Community Trips */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Community Trips
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search trips..." 
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>

        {communityTrips.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">No community trips available yet</p>
              <p className="text-sm text-gray-500">
                Check back later for trips shared by the community
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Community trips would be mapped here */}
          </div>
        )}
      </div>

      {/* Friends' Trips */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" />
          Friends' Trips
        </h2>
        
        {!user ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600 mb-4">Sign in to see trips shared by friends</p>
              <Button onClick={() => window.location.href = '/login'}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No trips shared by friends yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}