import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  DollarSign,
  Users,
  Archive,
  Trash2,
  Clock,
  Star,
  Image as ImageIcon
} from "lucide-react";
import type { TransitionItem, ItemDecision } from "@/types/transition.types";

interface ItemDecisionCardProps {
  item: TransitionItem;
  onUpdate: (itemId: string, updates: Partial<TransitionItem>) => Promise<void>;
}

const DECISION_CONFIG = {
  keep: {
    label: "Keep",
    icon: Heart,
    color: "bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
  },
  sell: {
    label: "Sell",
    icon: DollarSign,
    color: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300"
  },
  donate: {
    label: "Donate",
    icon: Users,
    color: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300"
  },
  store: {
    label: "Store",
    icon: Archive,
    color: "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300"
  },
  trash: {
    label: "Trash",
    icon: Trash2,
    color: "bg-red-100 text-red-700 hover:bg-red-200 border-red-300"
  },
  parking_lot: {
    label: "Decide Later",
    icon: Clock,
    color: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
  }
};

export function ItemDecisionCard({ item, onUpdate }: ItemDecisionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState(item.estimated_value?.toString() || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [emotionalDifficulty, setEmotionalDifficulty] = useState(item.emotional_difficulty || 0);

  const handleDecisionClick = async (decision: ItemDecision) => {
    await onUpdate(item.id, {
      decision,
      decision_date: new Date().toISOString()
    });
  };

  const handleValueChange = async () => {
    const value = parseFloat(estimatedValue) || null;
    await onUpdate(item.id, { estimated_value: value });
  };

  const handleNotesChange = async () => {
    await onUpdate(item.id, { notes });
  };

  const handleEmotionalDifficultyChange = async (rating: number) => {
    setEmotionalDifficulty(rating);
    await onUpdate(item.id, { emotional_difficulty: rating });
  };

  return (
    <Card className={`overflow-hidden transition-all ${
      item.decision ? 'opacity-75' : ''
    }`}>
      <CardContent className="p-4 space-y-4">
        {/* Item Header */}
        <div className="flex items-start gap-3">
          {/* Photo thumbnail */}
          <div className="h-16 w-16 flex-shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
            {item.photo_url ? (
              <img
                src={item.photo_url}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* Item info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium truncate">{item.name}</h4>
                {item.category && (
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                )}
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Current decision badge */}
              {item.decision && (
                <Badge variant="outline" className={DECISION_CONFIG[item.decision].color}>
                  {DECISION_CONFIG[item.decision].label}
                </Badge>
              )}
            </div>

            {/* Emotional difficulty stars (if set) */}
            {emotionalDifficulty > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-muted-foreground">Difficulty:</span>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Star
                    key={rating}
                    className={`h-3 w-3 ${
                      rating <= emotionalDifficulty
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick decision buttons */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(DECISION_CONFIG) as ItemDecision[]).map((decision) => {
            const config = DECISION_CONFIG[decision];
            const Icon = config.icon;
            const isSelected = item.decision === decision;

            return (
              <Button
                key={decision}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleDecisionClick(decision)}
                className={`${isSelected ? '' : config.color} transition-all`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Button>
            );
          })}
        </div>

        {/* Expandable details section */}
        {(isExpanded || item.decision === 'sell' || emotionalDifficulty > 0) && (
          <div className="space-y-3 pt-3 border-t">
            {/* Estimated value (shown always when "Sell" is selected) */}
            {(item.decision === 'sell' || estimatedValue) && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Estimated Value</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(e.target.value)}
                      onBlur={handleValueChange}
                      placeholder="0.00"
                      className="pl-7"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Emotional difficulty rating */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Emotional Difficulty (How hard is this to let go?)
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleEmotionalDifficultyChange(rating)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        rating <= emotionalDifficulty
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesChange}
                placeholder="Add any notes about this item..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}

        {/* Expand/Collapse button */}
        {!isExpanded && !(item.decision === 'sell' || emotionalDifficulty > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="w-full text-xs"
          >
            Add details (value, difficulty, notes)
          </Button>
        )}
        {isExpanded && !(item.decision === 'sell' || emotionalDifficulty > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="w-full text-xs"
          >
            Hide details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
