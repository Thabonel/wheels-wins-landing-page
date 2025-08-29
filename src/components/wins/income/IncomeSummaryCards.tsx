
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
}

function SummaryCard({ title, value, description, trend }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'} text-sm mt-1`}>
            <TrendingUp className="h-4 w-4" />
            <span>{trend.value}</span>
          </div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

interface IncomeSummaryCardsProps {
  totalIncome: number;
}

export default function IncomeSummaryCards({ totalIncome }: IncomeSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard 
        title="Total Income (YTD)"
        value={`$${totalIncome.toFixed(2)}`}
        trend={{ value: "+12% from last year", direction: "up" }}
      />
      
      <SummaryCard 
        title="Average Monthly"
        value="$1,462.00"
        description="Based on last 6 months"
      />
      
      <SummaryCard 
        title="Side Hustle Income"
        value="$625.00"
        trend={{ value: "+35% monthly growth", direction: "up" }}
      />
    </div>
  );
}
