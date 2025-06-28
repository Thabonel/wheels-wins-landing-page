import { useState, useEffect } from "react";

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  currentLocation: {
    coordinates: [number, number];
    placeName: string;
    lastUpdate: string;
  };
  status: 'traveling' | 'camped' | 'offline';
  travelDates: {
    startDate: string;
    endDate: string;
  };
  route?: RoutePoint[];
}

export interface RoutePoint {
  coordinates: [number, number];
  name: string;
  day: number;
}

export interface MeetupSuggestion {
  id: string;
  friend: Friend;
  meetupLocation: {
    coordinates: [number, number];
    placeName: string;
  };
  tripDay: number;
  costImpact: number;
  accommodations: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface GroupTrip {
  id: string;
  name: string;
  participants: Friend[];
  route: RoutePoint[];
  startDate: string;
  endDate: string;
  budget: {
    total: number;
    perPerson: number;
  };
  status: 'planning' | 'confirmed' | 'active' | 'completed';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: string[];
  type: 'meetup' | 'group_trip' | 'personal';
}

// Mock friends data
const MOCK_FRIENDS: Friend[] = [
  {
    id: '1',
    name: 'Sarah & Mike Johnson',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&h=150&fit=crop&crop=faces',
    currentLocation: {
      coordinates: [-109.5493, 38.5816],
      placeName: 'Moab, Utah',
      lastUpdate: '2 hours ago'
    },
    status: 'camped',
    travelDates: {
      startDate: '2024-07-01',
      endDate: '2024-07-15'
    },
    route: [
      { coordinates: [-109.5493, 38.5816], name: 'Moab, Utah', day: 1 },
      { coordinates: [-111.8910, 36.6297], name: 'Bryce Canyon, Utah', day: 5 },
      { coordinates: [-112.1871, 37.2982], name: 'Zion National Park, Utah', day: 8 }
    ]
  },
  {
    id: '2',
    name: 'Dave & Lisa Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
    currentLocation: {
      coordinates: [-105.2705, 40.0150],
      placeName: 'Boulder, Colorado',
      lastUpdate: '5 hours ago'
    },
    status: 'traveling',
    travelDates: {
      startDate: '2024-06-28',
      endDate: '2024-07-20'
    }
  },
  {
    id: '3',
    name: 'Robert Taylor',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces',
    currentLocation: {
      coordinates: [-117.1611, 32.7157],
      placeName: 'San Diego, California',
      lastUpdate: '1 day ago'
    },
    status: 'offline',
    travelDates: {
      startDate: '2024-07-10',
      endDate: '2024-07-25'
    }
  }
];

// Mock meetup suggestions
const MOCK_MEETUP_SUGGESTIONS: MeetupSuggestion[] = [
  {
    id: '1',
    friend: MOCK_FRIENDS[0],
    meetupLocation: {
      coordinates: [-109.5493, 38.5816],
      placeName: 'Moab, Utah'
    },
    tripDay: 5,
    costImpact: 67,
    accommodations: 'Arches National Park KOA',
    description: 'Add 2-day Moab extension for overlapping adventure time',
    confidence: 'high'
  },
  {
    id: '2',
    friend: MOCK_FRIENDS[1],
    meetupLocation: {
      coordinates: [-105.2705, 40.0150],
      placeName: 'Boulder, Colorado'
    },
    tripDay: 3,
    costImpact: -23,
    accommodations: 'Boulder Creek RV Resort',
    description: 'Minor detour saves money and adds friend time',
    confidence: 'medium'
  }
];

export function useSocialTripState() {
  // Friend management state
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [friendsVisible, setFriendsVisible] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // Meetup suggestions state
  const [meetupSuggestions, setMeetupSuggestions] = useState<MeetupSuggestion[]>(MOCK_MEETUP_SUGGESTIONS);
  const [suggestionsPanelOpen, setSuggestionsPanelOpen] = useState(false);

  // Group trip coordination state
  const [groupTrips, setGroupTrips] = useState<GroupTrip[]>([]);
  const [activeGroupTrip, setActiveGroupTrip] = useState<GroupTrip | null>(null);
  const [groupTripModalOpen, setGroupTripModalOpen] = useState(false);

  // Calendar events state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Social sidebar state
  const [socialSidebarOpen, setSocialSidebarOpen] = useState(false);

  // Friend location updates
  const updateFriendLocation = (friendId: string, location: Friend['currentLocation']) => {
    setFriends(prev => prev.map(friend => 
      friend.id === friendId 
        ? { ...friend, currentLocation: location }
        : friend
    ));
  };

  // Add friend functionality
  const addFriend = (friend: Friend) => {
    setFriends(prev => [...prev, friend]);
  };

  // Meetup suggestion actions
  const acceptMeetupSuggestion = (suggestionId: string) => {
    const suggestion = meetupSuggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      // Create calendar event
      const event: CalendarEvent = {
        id: `meetup-${suggestionId}`,
        title: `Meetup with ${suggestion.friend.name}`,
        date: new Date(Date.now() + suggestion.tripDay * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '15:00',
        location: suggestion.meetupLocation.placeName,
        attendees: [suggestion.friend.id],
        type: 'meetup'
      };
      setCalendarEvents(prev => [...prev, event]);
      
      // Remove from suggestions
      setMeetupSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    }
  };

  const dismissMeetupSuggestion = (suggestionId: string) => {
    setMeetupSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  // Group trip management
  const createGroupTrip = (tripData: Omit<GroupTrip, 'id'>) => {
    const newTrip: GroupTrip = {
      ...tripData,
      id: `group-${Date.now()}`
    };
    setGroupTrips(prev => [...prev, newTrip]);
    setActiveGroupTrip(newTrip);
    return newTrip;
  };

  // Calculate nearby friends based on current route
  const getNearbyFriends = (routeCoordinates: [number, number][], radiusMiles: number = 50) => {
    if (!routeCoordinates.length) return [];
    
    return friends.filter(friend => {
      const friendCoords = friend.currentLocation.coordinates;
      return routeCoordinates.some(routePoint => {
        const distance = calculateDistance(routePoint, friendCoords);
        return distance <= radiusMiles;
      });
    });
  };

  // Helper function to calculate distance between two points
  const calculateDistance = (coord1: [number, number], coord2: [number, number]) => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return {
    // Friend management
    friends,
    friendsVisible,
    setFriendsVisible,
    selectedFriend,
    setSelectedFriend,
    updateFriendLocation,
    addFriend,
    getNearbyFriends,

    // Meetup suggestions
    meetupSuggestions,
    suggestionsPanelOpen,
    setSuggestionsPanelOpen,
    acceptMeetupSuggestion,
    dismissMeetupSuggestion,

    // Group trips
    groupTrips,
    activeGroupTrip,
    setActiveGroupTrip,
    groupTripModalOpen,
    setGroupTripModalOpen,
    createGroupTrip,

    // Calendar
    calendarEvents,
    calendarVisible,
    setCalendarVisible,

    // Social sidebar
    socialSidebarOpen,
    setSocialSidebarOpen,
  };
}