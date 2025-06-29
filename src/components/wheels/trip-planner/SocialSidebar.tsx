import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Calendar, 
  MapPin, 
  X,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Friend, CalendarEvent, GroupTrip } from './hooks/useSocialTripState';

interface SocialSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  calendarEvents: CalendarEvent[];
  groupTrips: GroupTrip[];
  onMessageFriend?: (friend: Friend) => void;
  onOpenMeetupPlanner: () => void;
  onAddFriend?: () => void;
}

export default function SocialSidebar({
  isOpen,
  onClose,
  friends,
  calendarEvents,
  groupTrips,
  onMessageFriend,
  onOpenMeetupPlanner,
  onAddFriend
}: SocialSidebarProps) {
  if (!isOpen) return null;

  const getStatusColor = (status: Friend['status']) => {
    switch (status) {
      case 'traveling': return 'bg-warning/20 text-warning-foreground';
      case 'camped': return 'bg-success/20 text-success-foreground';
      case 'offline': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: Friend['status']) => {
    switch (status) {
      case 'traveling': return '🚐';
      case 'camped': return '🏕️';
      case 'offline': return '⚫';
      default: return '📍';
    }
  };

  // Get upcoming meetups for the next 7 days
  const upcomingMeetups = calendarEvents
    .filter(event => {
      const eventDate = new Date(event.date);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return eventDate >= today && eventDate <= nextWeek && event.type === 'meetup';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="h-full overflow-y-auto">
      {/* Quick Status Overview */}
      <div className="p-4 border-b bg-muted/30">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-primary">{friends.filter(f => f.status !== 'offline').length}</div>
            <div className="text-xs text-muted-foreground">Friends Online</div>
          </div>
          <div>
            <div className="text-lg font-bold text-success">{upcomingMeetups.length}</div>
            <div className="text-xs text-muted-foreground">Upcoming Meetups</div>
          </div>
        </div>
      </div>

      {/* Upcoming Meetups */}
      {upcomingMeetups.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            UPCOMING MEETUPS
          </h3>
          <div className="space-y-3">
            {upcomingMeetups.map((meetup) => (
              <Card key={meetup.id} className="p-3 bg-primary/5 border-primary/20">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{meetup.title}</h4>
                    <Badge variant="secondary" className="text-xs bg-primary/20 text-primary-foreground">
                      meetup
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(meetup.date).toLocaleDateString()} at {meetup.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{meetup.location}</span>
                    </div>

                    {meetup.attendees.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{meetup.attendees.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="p-4">
        <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          YOUR FRIENDS ({friends.length})
        </h3>

        <div className="space-y-3">
          {friends.map((friend) => {
            // Check if this friend has an upcoming meetup
            const friendMeetup = upcomingMeetups.find(meetup => 
              meetup.attendees.includes(friend.name)
            );

            return (
              <Card key={friend.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.avatar} alt={friend.name} />
                    <AvatarFallback className="text-xs">
                      {friend.name.split(' ').map(n => n.charAt(0)).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm truncate">{friend.name}</h4>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", getStatusColor(friend.status))}
                      >
                        {getStatusIcon(friend.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{friend.currentLocation.placeName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{friend.currentLocation.lastUpdate}</span>
                    </div>

                    {/* Show meetup info if scheduled */}
                    {friendMeetup && (
                      <div className="mt-2 p-2 bg-primary/10 rounded text-xs">
                        <div className="font-medium text-primary">
                          Meeting up: {new Date(friendMeetup.date).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground">
                          {friendMeetup.location} at {friendMeetup.time}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {friends.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No friends added yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use "Plan My Meetup" to add friends and coordinate meetups
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t">
        <Button
          className="w-full"
          onClick={() => {
            onClose();
            onOpenMeetupPlanner();
          }}
        >
          Create Trip
        </Button>
      </div>
    </div>
  );
}