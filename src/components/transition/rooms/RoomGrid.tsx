import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Home } from "lucide-react";
import { RoomCard } from "./RoomCard";
import type { TransitionRoom } from "@/types/transition.types";

interface RoomGridProps {
  rooms: TransitionRoom[];
  loading?: boolean;
  onRoomClick: (room: TransitionRoom) => void;
  onAddRoom?: () => void;
}

export function RoomGrid({
  rooms,
  loading = false,
  onRoomClick,
  onAddRoom
}: RoomGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading rooms...</p>
        </div>
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="rounded-full bg-muted p-6">
          <Home className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">No rooms yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Get started by creating your first room. We'll help you organize and make decisions
            about each item, room by room.
          </p>
        </div>
        {onAddRoom && (
          <Button onClick={onAddRoom} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Room
          </Button>
        )}
      </div>
    );
  }

  // Sort rooms: in-progress first, then not-started, then completed
  const sortedRooms = [...rooms].sort((a, b) => {
    const statusOrder = { in_progress: 0, not_started: 1, completed: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <div className="space-y-6">
      {/* Add Room Button */}
      {onAddRoom && (
        <div className="flex justify-end">
          <Button onClick={onAddRoom} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Button>
        </div>
      )}

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onClick={() => onRoomClick(room)}
          />
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{rooms.length}</div>
            <div className="text-xs text-muted-foreground">Total Rooms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {rooms.filter(r => r.status === 'in_progress').length}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {rooms.filter(r => r.status === 'completed').length}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {rooms.reduce((sum, r) => sum + r.total_items, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </div>
        </div>
      </div>

      {/* Helpful tip */}
      <div className="text-sm text-muted-foreground text-center italic">
        💡 Tip: Tackle one room at a time. Start with the easiest to build momentum!
      </div>
    </div>
  );
}
