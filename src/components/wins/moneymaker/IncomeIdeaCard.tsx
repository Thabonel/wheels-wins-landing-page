
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, TrendingUp, TrendingDown, Share2, Edit, Archive, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IncomeIdea } from "./types";
import ShareToHustleBoardModal from "./ShareToHustleBoardModal";

interface IncomeIdeaCardProps {
  idea: IncomeIdea;
  onEdit?: (idea: IncomeIdea) => void;
  onArchive?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export default function IncomeIdeaCard({ idea, onEdit, onArchive, onDelete }: IncomeIdeaCardProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Paused': return 'bg-yellow-500';
      case 'Archived': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-600" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-600" />;
    return null;
  };

  // Only show share option for successful ideas (earning $100+ per month)
  const canShare = idea.monthlyIncome >= 100 && idea.status === 'Active';

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-grow">
              <CardTitle className="text-lg mb-2">{idea.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${getStatusColor(idea.status)} text-white border-0`}>
                  {idea.status}
                </Badge>
                {idea.topPerformer && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    Top Performer
                  </Badge>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(idea)}>
                    <Edit size={16} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canShare && (
                  <>
                    <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
                      <Share2 size={16} className="mr-2" />
                      Share to Hustle Board
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onArchive && idea.status !== 'Archived' && (
                  <DropdownMenuItem onClick={() => onArchive(idea.id)}>
                    <Archive size={16} className="mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(idea.id)} className="text-red-600">
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${idea.monthlyIncome.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
              {getTrendIcon(idea.trend)}
            </div>

            {idea.growth !== undefined && idea.growth !== 0 && (
              <div className="text-sm">
                <span className={idea.growth > 0 ? "text-green-600" : "text-red-600"}>
                  {idea.growth > 0 ? "+" : ""}{idea.growth}% this month
                </span>
              </div>
            )}

            {typeof idea.progress === 'number' && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{idea.progress}%</span>
                </div>
                <Progress value={idea.progress} className="h-2" />
              </div>
            )}

            {idea.notes && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {idea.notes}
              </p>
            )}

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Started: {idea.startDate}</span>
              {idea.endDate && <span>Ended: {idea.endDate}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {canShare && (
        <ShareToHustleBoardModal
          idea={idea}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </>
  );
}
