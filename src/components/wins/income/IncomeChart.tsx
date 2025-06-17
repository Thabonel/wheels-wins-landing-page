
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface ChartDataItem {
  name: string;
  income: number;
}

interface IncomeChartProps {
  chartData: ChartDataItem[];
}

export default function IncomeChart({ chartData }: IncomeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#8B5CF6" 
                strokeWidth={2} 
                dot={{ r: 5 }} 
                activeDot={{ r: 8 }}
                name="Monthly Income" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
