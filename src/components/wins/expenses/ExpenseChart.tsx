
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useState } from "react";
import CategoryManagementModal from "./CategoryManagementModal";

export interface ChartDataItem {
  name: string;
  amount: number;
}

interface ExpenseChartProps {
  chartData: ChartDataItem[];
}

export default function ExpenseChart({ chartData }: ExpenseChartProps) {
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Expenses by Category</CardTitle>
          <CardDescription>
            Your spending breakdown for the past 30 days
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setManageCategoriesOpen(true)}
        >
          <Settings className="mr-2 h-4 w-4" />
          Manage Categories
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              <Bar dataKey="amount" name="Amount" barSize={50} radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  const colors = ['#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#6B7280'];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <CategoryManagementModal
          open={manageCategoriesOpen}
          onOpenChange={setManageCategoriesOpen}
        />
      </CardContent>
    </Card>
  );
}
