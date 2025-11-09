import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign, Package, CheckCircle2, Clock } from "lucide-react";
import { ItemDecisionCard } from "./ItemDecisionCard";
import type { TransitionRoom, TransitionItem, RoomDetailResponse } from "@/types/transition.types";

interface RoomDetailProps {
  room: TransitionRoom | null;
  open: boolean;
  onClose: () => void;
}

export function RoomDetail({ room, open, onClose }: RoomDetailProps) {
  const [items, setItems] = useState<TransitionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    keep_count: 0,
    sell_count: 0,
    donate_count: 0,
    store_count: 0,
    trash_count: 0,
    parking_lot_count: 0,
    estimated_sale_value: 0
  });

  // TODO: Fetch room items from API
  useEffect(() => {
    if (!room || !open) return;

    setLoading(true);
    // Mock data for now - will be replaced with actual API call
    const mockItems: TransitionItem[] = [
      {
        id: "1",
        room_id: room.id,
        profile_id: room.profile_id,
        user_id: room.user_id,
        name: "Coffee Table",
        description: "Wooden coffee table with glass top",
        category: "Furniture",
        decision: "sell",
        decision_date: new Date().toISOString(),
        estimated_value: 75.00,
        emotional_difficulty: 2,
        photo_url: null,
        notes: "Good condition, minor scratches",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "2",
        room_id: room.id,
        profile_id: room.profile_id,
        user_id: room.user_id,
        name: "Photo Albums",
        description: "Family photo albums from 1990-2010",
        category: "Memorabilia",
        decision: "parking_lot",
        decision_date: null,
        estimated_value: null,
        emotional_difficulty: 5,
        photo_url: null,
        notes: "Need to digitize first",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "3",
        room_id: room.id,
        profile_id: room.profile_id,
        user_id: room.user_id,
        name: "Floor Lamp",
        description: "Modern floor lamp",
        category: "Furniture",
        decision: null,
        decision_date: null,
        estimated_value: null,
        emotional_difficulty: null,
        photo_url: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    setTimeout(() => {
      setItems(mockItems);
      calculateStats(mockItems);
      setLoading(false);
    }, 300);
  }, [room, open]);

  const calculateStats = (itemsList: TransitionItem[]) => {
    const newStats = {
      keep_count: itemsList.filter(i => i.decision === 'keep').length,
      sell_count: itemsList.filter(i => i.decision === 'sell').length,
      donate_count: itemsList.filter(i => i.decision === 'donate').length,
      store_count: itemsList.filter(i => i.decision === 'store').length,
      trash_count: itemsList.filter(i => i.decision === 'trash').length,
      parking_lot_count: itemsList.filter(i => i.decision === 'parking_lot').length,
      estimated_sale_value: itemsList
        .filter(i => i.decision === 'sell')
        .reduce((sum, i) => sum + (i.estimated_value || 0), 0)
    };
    setStats(newStats);
  };

  const handleItemUpdate = async (itemId: string, updates: Partial<TransitionItem>) => {
    // TODO: Call API to update item
    console.log("Updating item:", itemId, updates);

    // Optimistic update
    setItems(prevItems => {
      const newItems = prevItems.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      calculateStats(newItems);
      return newItems;
    });
  };

  const handleAddItem = () => {
    // TODO: Open add item dialog
    console.log("Add item clicked");
  };

  if (!room) return null;

  // Filter items by category
  const decidedItems = items.filter(i => i.decision && i.decision !== 'parking_lot');
  const undecidedItems = items.filter(i => !i.decision);
  const parkingLotItems = items.filter(i => i.decision === 'parking_lot');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{room.name}</DialogTitle>
          <DialogDescription>
            Make quick decisions about each item in this room
          </DialogDescription>
        </DialogHeader>

        {/* Progress Header */}
        <div className="space-y-3 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="text-3xl font-bold">{room.completion_percentage}%</div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm text-muted-foreground">Items</div>
              <div className="text-lg font-semibold">
                <span className="text-blue-600">{room.decided_items}</span>
                {" / "}
                <span className="text-muted-foreground">{room.total_items}</span>
              </div>
            </div>
          </div>
          <Progress value={room.completion_percentage} className="h-2" />

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="font-semibold">{stats.keep_count}</div>
              <div className="text-xs text-muted-foreground">Keep</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="font-semibold">{stats.sell_count}</div>
              <div className="text-xs text-muted-foreground">Sell</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="font-semibold">{stats.donate_count}</div>
              <div className="text-xs text-muted-foreground">Donate</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="font-semibold flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                {stats.estimated_sale_value.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Est. Value</div>
            </div>
          </div>
        </div>

        {/* Add item button */}
        <Button onClick={handleAddItem} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Item to Room
        </Button>

        {/* Items organized by status */}
        <Tabs defaultValue="undecided" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="undecided">
              <Package className="h-3 w-3 mr-1" />
              Undecided ({undecidedItems.length})
            </TabsTrigger>
            <TabsTrigger value="decided">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Decided ({decidedItems.length})
            </TabsTrigger>
            <TabsTrigger value="parking_lot">
              <Clock className="h-3 w-3 mr-1" />
              Parking Lot ({parkingLotItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="undecided" className="space-y-3">
            {undecidedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No undecided items</p>
                <p className="text-sm">All items have been categorized!</p>
              </div>
            ) : (
              undecidedItems.map(item => (
                <ItemDecisionCard
                  key={item.id}
                  item={item}
                  onUpdate={handleItemUpdate}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="decided" className="space-y-3">
            {decidedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items decided yet</p>
                <p className="text-sm">Make your first decision to get started</p>
              </div>
            ) : (
              decidedItems.map(item => (
                <ItemDecisionCard
                  key={item.id}
                  item={item}
                  onUpdate={handleItemUpdate}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="parking_lot" className="space-y-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-3">
              <p className="text-sm text-orange-800">
                💡 <strong>Parking Lot:</strong> Use this for items that are emotionally difficult or need more time to decide.
                Come back to these later when you're ready.
              </p>
            </div>
            {parkingLotItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items in parking lot</p>
                <p className="text-sm">Items you want to decide on later will appear here</p>
              </div>
            ) : (
              parkingLotItems.map(item => (
                <ItemDecisionCard
                  key={item.id}
                  item={item}
                  onUpdate={handleItemUpdate}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
