
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Pie, PieChart } from "recharts";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";

export default function WinsOverview() {
  // Sample data for charts - in a real app this would come from API/database
  const monthlyData = [
    { name: 'Jan', income: 1200, expenses: 900 },
    { name: 'Feb', income: 1400, expenses: 1000 },
    { name: 'Mar', income: 1300, expenses: 1100 },
    { name: 'Apr', income: 1500, expenses: 950 },
    { name: 'May', income: 1700, expenses: 1250 },
  ];
  
  const categoryData = [
    { name: 'Fuel', value: 350, fill: '#8B5CF6' },
    { name: 'Food', value: 450, fill: '#0EA5E9' },
    { name: 'Camp', value: 300, fill: '#10B981' },
    { name: 'Fun', value: 150, fill: '#F59E0B' },
    { name: 'Other', value: 100, fill: '#6B7280' },
  ];
  
  const summaryStats = [
    { 
      title: "Remaining This Month", 
      value: "$1,245", 
      description: "Budget until June 4", 
      icon: <Calendar className="h-5 w-5 text-blue-500" /> 
    },
    { 
      title: "Average Daily Spend", 
      value: "$68", 
      description: "Last 30 days", 
      icon: <DollarSign className="h-5 w-5 text-purple-500" /> 
    },
    { 
      title: "Total Earned", 
      value: "$7,350", 
      description: "Year to date", 
      icon: <TrendingUp className="h-5 w-5 text-green-500" /> 
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Big Number Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="p-1 bg-muted rounded-full">
                  {stat.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line Chart: Money In vs Out */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#8B5CF6" strokeWidth={2} activeDot={{ r: 8 }} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#0EA5E9" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Spending Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pam's Financial Summary */}
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-blue-100 p-1 rounded-full">
                  <img
                    src={getPublicAssetUrl('Pam.webp')}
                    alt="Pam"
                    className="h-6 w-6 rounded-full"
                  />
              </span>
              <span>Pam's Financial Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-white rounded-lg border border-blue-100">
                <p className="font-medium text-blue-900">You're spending $68/day on average</p>
                <p className="text-muted-foreground mt-1">At this rate, you have 22 days of budget left</p>
              </div>
              
              <div className="p-3 bg-white rounded-lg border border-blue-100">
                <p className="font-medium text-blue-900">Your daily food expenses are down 12% this week!</p>
                <p className="text-muted-foreground mt-1">Great job on grocery shopping instead of eating out</p>
              </div>
              
              <div className="p-3 bg-white rounded-lg border border-blue-100">
                <p className="font-medium text-blue-900">Fuel costs are trending higher than usual</p>
                <p className="text-muted-foreground mt-1">Consider planning stops at the lowest-cost fuel stations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-md">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-purple-600">{`Income: $${payload[0].value}`}</p>
        <p className="text-sm text-blue-600">{`Expenses: $${payload[1].value}`}</p>
        <p className="text-sm font-medium text-green-600">{`Net: $${payload[0].value - payload[1].value}`}</p>
      </div>
    );
  }
  return null;
};
