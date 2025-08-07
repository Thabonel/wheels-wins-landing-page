import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Pie, PieChart } from "recharts";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { DollarSign, TrendingUp, Calendar, Sparkles, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePamWebSocketConnection } from "@/hooks/pam/usePamWebSocketConnection";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { useExpenses } from "@/context/ExpensesContext";
import { useIncomeData } from "@/components/wins/income/useIncomeData";
import QuickActions from "./QuickActions";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { pamSavingsApi } from "@/services/pamSavingsService";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const WinsOverview = React.memo(() => {
  const { user, token } = useAuth();
  const { summary } = useFinancialSummary();
  const { state: expensesState } = useExpenses();
  const { incomeData, chartData: incomeChartData } = useIncomeData();
  const [pamInsights, setPamInsights] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Fetch PAM savings data with error handling
  const { data: guaranteeStatus } = useQuery({
    queryKey: ['guarantee-status'],
    queryFn: async () => {
      try {
        if (!user) return null;
        return await pamSavingsApi.getGuaranteeStatus();
      } catch (err) {
        console.warn('Failed to fetch guarantee status in WinsOverview:', err);
        return null;
      }
    },
    refetchInterval: 60000, // Refresh every minute
    enabled: !!user
  });

  const { data: monthlySummary } = useQuery({
    queryKey: ['monthly-savings-summary'],
    queryFn: async () => {
      try {
        if (!user) return null;
        return await pamSavingsApi.getMonthlySavingsSummary();
      } catch (err) {
        console.warn('Failed to fetch monthly summary in WinsOverview:', err);
        return null;
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    enabled: !!user
  });

  const { data: recentSavings } = useQuery({
    queryKey: ['recent-savings-events'],
    queryFn: async () => {
      try {
        if (!user) return [];
        return await pamSavingsApi.getRecentSavingsEvents(10);
      } catch (err) {
        console.warn('Failed to fetch recent savings in WinsOverview:', err);
        return [];
      }
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    enabled: !!user
  });

  const handlePamMessage = useCallback((msg: any) => {
    if (msg.type === 'chat_response') {
      setPamInsights((prev) => [...prev, msg.message || msg.content]);
    }
  }, []);

  const handleStatusChange = useCallback(() => {}, []);

  const { isConnected, sendMessage } = usePamWebSocketConnection({
    userId: user?.id || 'anonymous',
    token,
    onMessage: handlePamMessage,
    onStatusChange: handleStatusChange
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
  }, [user, isConnected, pamInsights.length, sendMessage]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const monthlyData = useMemo(() => {
    const months = new Map<string, { income: number; expenses: number }>();
    incomeChartData.forEach(item => {
      if (!months.has(item.name)) {
        months.set(item.name, { income: 0, expenses: 0 });
      }
      months.get(item.name)!.income = item.income;
    });
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

  const categoryData = useMemo(() => {
    const colors = ['#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#6B7280', '#EF4444', '#F97316', '#84CC16'];
    if (summary?.expense_categories?.length) {
      return summary.expense_categories.map((cat, index) => ({
        name: cat.category,
        value: cat.amount,
        fill: colors[index % colors.length]
      }));
    }
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

  const summaryStats = useMemo(() => {
    const baseStats = summary
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

    // Add PAM savings stat if available
    if (guaranteeStatus) {
      baseStats.push({
        title: "PAM Savings",
        value: formatCurrency(guaranteeStatus.total_savings),
        description: guaranteeStatus.guarantee_met ? "Guarantee Met! ✓" : `${Math.round(guaranteeStatus.percentage_achieved)}% of goal`,
        icon: <Sparkles className="h-5 w-5 text-cyan-500" />
      });
    }

    return baseStats;
  }, [summary, incomeData, expensesState.expenses, guaranteeStatus]);

  // Quick Actions handlers
  const handleAddExpense = useCallback((preset?: { category?: string }) => {
    // Store preset in sessionStorage if provided
    if (preset?.category) {
      sessionStorage.setItem('expensePreset', JSON.stringify(preset));
    }
    // Mark that we want to open the form
    sessionStorage.setItem('openExpenseForm', 'true');
    // Navigate to expenses tab
    const winsPage = document.querySelector('[value="expenses"]') as HTMLButtonElement;
    if (winsPage) {
      winsPage.click();
    } else {
      // Fallback navigation
      window.location.hash = '#expenses';
    }
  }, []);

  const handleAddIncome = useCallback(() => {
    // Mark that we want to open the form
    sessionStorage.setItem('openIncomeForm', 'true');
    // Navigate to income tab
    const incomePage = document.querySelector('[value="income"]') as HTMLButtonElement;
    if (incomePage) {
      incomePage.click();
    } else {
      window.location.hash = '#income';
    }
  }, []);

  const handleOpenReceipt = useCallback(() => {
    sessionStorage.setItem('openReceiptUpload', 'true');
    handleAddExpense();
  }, [handleAddExpense]);

  const handleVoiceEntry = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice Entry Not Available",
        description: "Your browser doesn't support voice recognition. Try Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }
    sessionStorage.setItem('startVoiceEntry', 'true');
    handleAddExpense();
  }, [handleAddExpense, toast]);

  // Check if voice is available
  const isVoiceAvailable = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  return (
    <div className="space-y-6">
      {/* Quick Actions Widget - Always at the top */}
      <QuickActions
        onAddExpense={handleAddExpense}
        onAddIncome={handleAddIncome}
        onOpenReceipt={handleOpenReceipt}
        onVoiceEntry={handleVoiceEntry}
        isVoiceAvailable={isVoiceAvailable}
        isOffline={isOffline}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* PAM Savings Guarantee Section */}
      {guaranteeStatus && (
        <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-cyan-500" />
                <CardTitle>PAM Savings Guarantee Progress</CardTitle>
              </div>
              {guaranteeStatus.guarantee_met && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Guaranteed!
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Saved</p>
                <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {formatCurrency(guaranteeStatus.total_savings)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="text-xl font-bold">
                  {formatCurrency(guaranteeStatus.subscription_cost)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Savings Count</p>
                <p className="text-xl font-bold">
                  {guaranteeStatus.savings_events_count}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(guaranteeStatus.percentage_achieved)}%
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly Guarantee Progress</span>
                <span className="font-medium">{Math.round(guaranteeStatus.percentage_achieved)}%</span>
              </div>
              <Progress 
                value={guaranteeStatus.percentage_achieved} 
                className="h-3"
              />
              <p className="text-sm text-muted-foreground">
                {guaranteeStatus.guarantee_met 
                  ? "🎉 You've saved more than your subscription cost this month!"
                  : `${formatCurrency(guaranteeStatus.savings_shortfall)} more savings needed to guarantee your subscription`}
              </p>
            </div>

            {/* Recent Savings Events */}
            {recentSavings && recentSavings.length > 0 && (
              <div className="pt-4 border-t border-cyan-200 dark:border-cyan-800">
                <h4 className="text-sm font-medium mb-3">Recent PAM Savings</h4>
                <div className="space-y-2">
                  {recentSavings.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.savings_description}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.category} • {new Date(event.saved_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                          +{formatCurrency(event.actual_savings)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(event.confidence_score * 100)}% confident
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            
            {/* Show PAM savings by category if available */}
            {recentSavings && recentSavings.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">PAM Savings by Category</h4>
                <div className="space-y-1">
                  {(() => {
                    const savingsByCategory = recentSavings.reduce((acc, event) => {
                      acc[event.category] = (acc[event.category] || 0) + event.actual_savings;
                      return acc;
                    }, {} as Record<string, number>);
                    
                    return Object.entries(savingsByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([category, amount]) => (
                        <div key={category} className="flex justify-between text-sm">
                          <span className="text-muted-foreground capitalize">{category}</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            +{formatCurrency(amount)}
                          </span>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-blue-100 p-1 rounded-full">
                <img src={getPublicAssetUrl('Pam.webp')} alt="PAM AI assistant for RV trip planning and budget tracking" className="h-6 w-6 rounded-full" />
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
              ) : isOffline || !isConnected ? (
                <FallbackFinancialTips 
                  totalExpenses={expensesState.expenses.reduce((sum, exp) => sum + exp.amount, 0)}
                  totalIncome={incomeData.reduce((sum, inc) => sum + inc.amount, 0)}
                  topCategory={categoryData[0]?.name}
                />
              ) : (
                <p className="text-muted-foreground">Connecting to PAM...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

WinsOverview.displayName = 'WinsOverview';
export default WinsOverview;

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

// Fallback tips when PAM is not available
const FallbackFinancialTips: React.FC<{
  totalExpenses: number;
  totalIncome: number;
  topCategory?: string;
}> = ({ totalExpenses, totalIncome, topCategory }) => {
  const netIncome = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : 0;
  
  const tips = [
    {
      condition: netIncome < 0,
      tip: `You're spending more than you're earning. Consider reducing expenses in ${topCategory || 'your top spending category'}.`
    },
    {
      condition: Number(savingsRate) < 20 && netIncome > 0,
      tip: `Your savings rate is ${savingsRate}%. Aim for 20% or more for better financial health.`
    },
    {
      condition: topCategory === 'Fuel',
      tip: "Fuel is your top expense. Consider planning more efficient routes to save on gas."
    },
    {
      condition: topCategory === 'Food',
      tip: "Food is your biggest expense. Cooking in your RV more often can significantly reduce costs."
    },
    {
      condition: Number(savingsRate) >= 20,
      tip: `Great job! You're saving ${savingsRate}% of your income. Keep up the good financial habits!`
    }
  ];

  const activeTips = tips.filter(t => t.condition).slice(0, 2);
  
  if (activeTips.length === 0) {
    activeTips.push({
      condition: true,
      tip: "Track your expenses regularly to identify areas where you can save money on the road."
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground mb-2">
        {!navigator.onLine ? "Offline mode - showing cached tips" : "PAM is temporarily unavailable"}
      </p>
      {activeTips.map((tip, idx) => (
        <div key={idx} className="p-3 bg-white rounded-lg border border-blue-100">
          <p className="font-medium text-blue-900">{tip.tip}</p>
        </div>
      ))}
    </div>
  );
};
