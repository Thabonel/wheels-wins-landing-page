
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Pie, PieChart } from "recharts";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePamWebSocketConnection } from "@/hooks/pam/usePamWebSocketConnection";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { useExpenses } from "@/context/ExpensesContext";
import { useIncomeData } from "@/components/wins/income/useIncomeData";

export default function WinsOverview() {
  const { user, token } = useAuth();
  const { summary } = useFinancialSummary();
  const { state: expensesState } = useExpenses();
  const { incomeData, chartData: incomeChartData } = useIncomeData();
  const [pamInsights, setPamInsights] = useState<string[]>([]);

  const { isConnected, sendMessage } = usePamWebSocketConnection({
    userId: user?.id || 'anonymous',
    token,
    onMessage: (msg) => {
      if (msg.type === 'chat_response') {
        setPamInsights((prev) => [...prev, msg.message || msg.content]);
      }
    },
    onStatusChange: () => {}
  });

  useEffect(() => {
    if (user && isConnected && pamInsights.length === 0) {
      sendMessage({
        type: 'chat',
        message: 'Show me my financial summary for this month',
        user_id: user.id,
        context: { source: 'wins_overview' }
      });
    }
  }, [user, isConnected]);

  // Generate monthly data from real income and expense data
  const monthlyData = React.useMemo(() => {
    const months = new Map<string, { income: number; expenses: number }>();
    
    // Process income data
    incomeChartData.forEach(item => {
      if (!months.has(item.name)) {
        months.set(item.name, { income: 0, expenses: 0 });
      }
      months.get(item.name)!.income = item.income;
    });
    
    // Process expense data by month
    expensesState.expenses.forEach(expense => {
      const month = new Date(expense.date).toLocaleDateString('en-US', { month: 'short' });
      if (!months.has(month)) {
        months.set(month, { income: 0, expenses: 0 });
      }
      months.get(month)!.expenses += expense.amount;
    });
    
    return Array.from(months.entries()).map(([name, data]) => ({
      name,
      income: data.income,
      expenses: data.expenses
    }));
  }, [incomeChartData, expensesState.expenses]);
  
  // Generate category data from real expense data or financial summary
  const categoryData = React.useMemo(() => {
    const colors = ['#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#6B7280', '#EF4444', '#F97316', '#84CC16'];
    
    if (summary?.expense_categories && summary.expense_categories.length > 0) {
      return summary.expense_categories.map((cat, index) => ({
        name: cat.category,
        value: cat.amount,
        fill: colors[index % colors.length]
      }));
    }
    
    // Fallback: calculate from expenses data
    const categoryTotals = expensesState.expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryTotals).map(([name, value], index) => ({
      name,
      value,
      fill: colors[index % colors.length]
    }));
  }, [summary?.expense_categories, expensesState.expenses]);
  
  const summaryStats = summary
    ? [
        {
          title: "Total Income",
          value: `$${summary.total_income.toFixed(2)}`,
          description: `Last ${summary.period_days} days`,
          icon: <TrendingUp className="h-5 w-5 text-green-500" />
        },
        {
          title: "Total Expenses",
          value: `$${summary.total_expenses.toFixed(2)}`,
          description: `Last ${summary.period_days} days`,
          icon: <DollarSign className="h-5 w-5 text-purple-500" />
        },
        {
          title: "Net Income",
          value: `$${summary.net_income.toFixed(2)}`,
          description: new Date(summary.generated_at).toLocaleDateString(),
          icon: <Calendar className="h-5 w-5 text-blue-500" />
        }
      ]
    : [
        {
          title: "Total Expenses",
          value: `$${expensesState.expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}`,
          description: "All time",
          icon: <DollarSign className="h-5 w-5 text-purple-500" />
        },
        {
          title: "Total Income",
          value: `$${incomeData.reduce((sum, inc) => sum + inc.amount, 0).toFixed(2)}`,
          description: "All time",
          icon: <TrendingUp className="h-5 w-5 text-green-500" />
        },
        {
          title: "Net Balance",
          value: `$${(incomeData.reduce((sum, inc) => sum + inc.amount, 0) - expensesState.expenses.reduce((sum, exp) => sum + exp.amount, 0)).toFixed(2)}`,
          description: "All time",
          icon: <Calendar className="h-5 w-5 text-blue-500" />
        }
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
              {pamInsights.length > 0 ? (
                pamInsights.map((insight, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-900">{insight}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Connecting to PAM...</p>
              )}
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
