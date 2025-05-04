
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ChevronDown, Edit, Archive, Share2 } from "lucide-react";

interface IncomeIdeaProps {
  id: number;
  name: string;
  status: string;
  monthlyIncome: number;
  startDate: string;
  trend?: string;
  growth?: number;
  notes: string;
  topPerformer?: boolean;
  endDate?: string;
}

export default function IncomeIdeaCard({
  name,
  status,
  monthlyIncome,
  startDate,
  trend,
  growth,
  notes,
  topPerformer,
  endDate,
}: IncomeIdeaProps) {
  const isArchived = status === "Archived";

  return (
    <Card className={`border ${topPerformer ? 'border-purple-200' : ''} ${isArchived ? 'bg-muted/20' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {name}
            {topPerformer && 
              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
                Top Performer
              </Badge>
            }
            {status === "Paused" && 
              <Badge variant="outline" className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-200">
                Paused
              </Badge>
            }
            {isArchived && 
              <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                Archived
              </Badge>
            }
          </CardTitle>
          {!isArchived && (
            <div className="text-right">
              <div className="text-lg font-bold">${monthlyIncome}</div>
              <div className="text-xs text-muted-foreground">per month</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm mt-1">
          {isArchived ? (
            <span className="text-muted-foreground">{startDate} - {endDate}</span>
          ) : (
            <>
              <span className="text-muted-foreground">Since {startDate}</span>
              {trend && growth && (
                <div className={`ml-auto flex items-center gap-1 ${
                  trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend === 'up' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span>{Math.abs(growth)}% {trend === 'up' ? 'growth' : 'decrease'}</span>
                </div>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm">{notes}</p>
      </CardContent>
      <CardFooter className="pt-0 border-t flex justify-between items-center">
        {isArchived ? (
          <div className="flex justify-end gap-1 w-full">
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-blue-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              Reactivate
            </Button>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {status === "Active" ? "Currently active" : "Temporarily paused"}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
