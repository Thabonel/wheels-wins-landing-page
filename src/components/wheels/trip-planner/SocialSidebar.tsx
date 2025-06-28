import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Route, 
  X,
  MessageSquare,
  UserPlus,
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
  onCreateGroupTrip?: () => void;
  onAddFriend?: () => void;
}

export default function SocialSidebar({
  isOpen,
  onClose,
  friends,
  calendarEvents,
  groupTrips,
  onMessageFriend,
  onCreateGroupTrip,
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

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meetup': return 'bg-primary/20 text-primary-foreground';
      case 'group_trip': return 'bg-secondary/20 text-secondary-foreground';
      case 'personal': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTripStatusColor = (status: GroupTrip['status']) => {
    switch (status) {
      case 'planning': return 'bg-warning/20 text-warning-foreground';
      case 'confirmed': return 'bg-success/20 text-success-foreground';
      case 'active': return 'bg-primary/20 text-primary-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const upcomingEvents = calendarEvents
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-xl z-50 overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Social Dashboard
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="trips">Group Trips</TabsTrigger>
            </TabsList>

            {/* Friends Tab */}
            <TabsContent value="friends" className="m-0 px-4 pb-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    YOUR FRIENDS ({friends.length})
                  </h3>
                  {onAddFriend && (
                    <Button variant="outline" size="sm" onClick={onAddFriend}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Friend
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {friends.map((friend) => (
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
                        </div>
                      </div>

                      {onMessageFriend && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => onMessageFriend(friend)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      )}
                    </Card>
                  ))}

                  {friends.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No friends added yet</p>
                      {onAddFriend && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={onAddFriend}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Your First Friend
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="m-0 px-4 pb-4">
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">
                  UPCOMING EVENTS ({upcomingEvents.length})
                </h3>

                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <Card key={event.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", getEventTypeColor(event.type))}
                          >
                            {event.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{event.location}</span>
                          </div>

                          {event.attendees.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{event.attendees.length} attendee(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                  {upcomingEvents.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No upcoming events</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Group Trips Tab */}
            <TabsContent value="trips" className="m-0 px-4 pb-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    GROUP TRIPS ({groupTrips.length})
                  </h3>
                  {onCreateGroupTrip && (
                    <Button variant="outline" size="sm" onClick={onCreateGroupTrip}>
                      <Route className="w-4 h-4 mr-2" />
                      Create Trip
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {groupTrips.map((trip) => (
                    <Card key={trip.id} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{trip.name}</h4>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", getTripStatusColor(trip.status))}
                          >
                            {trip.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{trip.participants.length} participant(s)</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">Budget: ${trip.budget.total} (${trip.budget.perPerson}/person)</span>
                          </div>
                        </div>

                      </div>
                    </Card>
                  ))}

                  {groupTrips.length === 0 && (
                    <div className="text-center py-8">
                      <Route className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No group trips yet</p>
                      {onCreateGroupTrip && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={onCreateGroupTrip}>
                          <Route className="w-4 h-4 mr-2" />
                          Plan Your First Group Trip
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}