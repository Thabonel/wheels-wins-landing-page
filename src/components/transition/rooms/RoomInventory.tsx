import { useState, useEffect } from "react";
import { RoomGrid } from "./RoomGrid";
import { RoomDetail } from "./RoomDetail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Home, TrendingUp, DollarSign } from "lucide-react";
import type { TransitionRoom, DownsizingStats } from "@/types/transition.types";

export function RoomInventory() {
  const [rooms, setRooms] = useState<TransitionRoom[]>([]);
  const [stats, setStats] = useState<DownsizingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<TransitionRoom | null>(null);
  const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false);

  // TODO: Fetch rooms and stats from API
  useEffect(() => {
    // Mock data for now - will be replaced with actual API call
    const mockRooms: TransitionRoom[] = [
      {
        id: "1",
        profile_id: "profile-1",
        user_id: "user-1",
        name: "Living Room",
        room_type: "living_room",
        status: "in_progress",
        total_items: 45,
        decided_items: 23,
        completion_percentage: 51,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "2",
        profile_id: "profile-1",
        user_id: "user-1",
        name: "Master Bedroom",
        room_type: "bedroom",
        status: "not_started",
        total_items: 0,
        decided_items: 0,
        completion_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const mockStats: DownsizingStats = {
      total_rooms: 6,
      completed_rooms: 0,
      total_items: 45,
      decided_items: 23,
      keep_count: 15,
      sell_count: 5,
      donate_count: 3,
      store_count: 0,
      trash_count: 0,
      parking_lot_count: 0,
      estimated_sale_value: 350.00,
      overall_completion: 25
    };

    setTimeout(() => {
      setRooms(mockRooms);
      setStats(mockStats);
      setLoading(false);
    }, 500);
  }, []);

  const handleRoomClick = (room: TransitionRoom) => {
    setSelectedRoom(room);
    setIsRoomDetailOpen(true);
  };

  const handleCloseRoomDetail = () => {
    setIsRoomDetailOpen(false);
    setSelectedRoom(null);
  };

  const handleAddRoom = () => {
    // TODO: Open add room dialog
    console.log("Add room clicked");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Room Inventory</h2>
        <p className="text-muted-foreground">
          Organize your downsizing journey room by room
        </p>
      </div>

      {/* Overall Progress Card */}
      {stats && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Overall Progress
            </CardTitle>
            <CardDescription>
              Your downsizing journey across all rooms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Progress</span>
                <span className="font-medium">{stats.overall_completion}%</span>
              </div>
              <Progress value={stats.overall_completion} className="h-3" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Items</div>
                <div className="text-2xl font-bold">{stats.total_items}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Decisions Made</div>
                <div className="text-2xl font-bold text-blue-600">{stats.decided_items}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Rooms Done</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.completed_rooms}/{stats.total_rooms}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Est. Value
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  ${stats.estimated_sale_value.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Decision breakdown */}
            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-3">Decision Breakdown</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground">Keep:</span>
                  <span className="font-medium">{stats.keep_count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                  <span className="text-muted-foreground">Sell:</span>
                  <span className="font-medium">{stats.sell_count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span className="text-muted-foreground">Donate:</span>
                  <span className="font-medium">{stats.donate_count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                  <span className="text-muted-foreground">Store:</span>
                  <span className="font-medium">{stats.store_count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-muted-foreground">Trash:</span>
                  <span className="font-medium">{stats.trash_count}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for filtering rooms */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Rooms ({rooms.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({rooms.filter(r => r.status === 'in_progress').length})
          </TabsTrigger>
          <TabsTrigger value="not_started">
            Not Started ({rooms.filter(r => r.status === 'not_started').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({rooms.filter(r => r.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <RoomGrid
            rooms={rooms}
            loading={loading}
            onRoomClick={handleRoomClick}
            onAddRoom={handleAddRoom}
          />
        </TabsContent>

        <TabsContent value="in_progress">
          <RoomGrid
            rooms={rooms.filter(r => r.status === 'in_progress')}
            loading={loading}
            onRoomClick={handleRoomClick}
            onAddRoom={handleAddRoom}
          />
        </TabsContent>

        <TabsContent value="not_started">
          <RoomGrid
            rooms={rooms.filter(r => r.status === 'not_started')}
            loading={loading}
            onRoomClick={handleRoomClick}
            onAddRoom={handleAddRoom}
          />
        </TabsContent>

        <TabsContent value="completed">
          <RoomGrid
            rooms={rooms.filter(r => r.status === 'completed')}
            loading={loading}
            onRoomClick={handleRoomClick}
            onAddRoom={handleAddRoom}
          />
        </TabsContent>
      </Tabs>

      {/* Room Detail Modal */}
      <RoomDetail
        room={selectedRoom}
        open={isRoomDetailOpen}
        onClose={handleCloseRoomDetail}
      />
    </div>
  );
}
