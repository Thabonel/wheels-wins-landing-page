import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Home, Package, CheckCircle2 } from "lucide-react";
import type { TransitionRoom } from "@/types/transition.types";

interface RoomCardProps {
  room: TransitionRoom;
  onClick: () => void;
}

const STATUS_CONFIG = {
  not_started: {
    label: "Not Started",
    variant: "outline" as const,
    color: "text-muted-foreground"
  },
  in_progress: {
    label: "In Progress",
    variant: "secondary" as const,
    color: "text-blue-600"
  },
  completed: {
    label: "Completed",
    variant: "default" as const,
    color: "text-green-600"
  }
};

const ROOM_TYPE_ICONS = {
  living_room: "🛋️",
  bedroom: "🛏️",
  kitchen: "🍳",
  bathroom: "🚿",
  garage: "🚗",
  storage: "📦",
  office: "💼",
  other: "🏠",
  custom: "📍"
};

export function RoomCard({ room, onClick }: RoomCardProps) {
  const statusConfig = STATUS_CONFIG[room.status];
  const icon = ROOM_TYPE_ICONS[room.room_type] || ROOM_TYPE_ICONS.custom;
  const isComplete = room.completion_percentage === 100;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 relative overflow-hidden"
      onClick={onClick}
    >
      {/* Completion overlay for visual feedback */}
      {isComplete && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="absolute top-2 right-[-32px] w-32 bg-green-500 text-white text-xs text-center py-1 rotate-45 shadow">
            Done
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <span>{room.name}</span>
          </CardTitle>
          <Badge variant={statusConfig.variant} className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{room.completion_percentage}%</span>
          </div>
          <Progress
            value={room.completion_percentage}
            className={`h-2 ${
              isComplete
                ? '[&>div]:bg-green-500'
                : room.completion_percentage > 0
                  ? '[&>div]:bg-blue-500'
                  : ''
            }`}
          />
        </div>

        {/* Stats section */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Package className="h-3 w-3" />
            </div>
            <div className="text-lg font-semibold">{room.total_items}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <CheckCircle2 className="h-3 w-3" />
            </div>
            <div className="text-lg font-semibold text-blue-600">{room.decided_items}</div>
            <div className="text-xs text-muted-foreground">Decided</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Home className="h-3 w-3" />
            </div>
            <div className="text-lg font-semibold text-orange-600">
              {room.total_items - room.decided_items}
            </div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
        </div>

        {/* Hover hint */}
        <div className="text-xs text-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Click to view items
        </div>
      </CardContent>
    </Card>
  );
}
