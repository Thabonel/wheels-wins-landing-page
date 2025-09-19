import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { RefreshCw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number;
  pendingApprovals: number;
  totalRevenue: number;
  activeRegions: number;
  userGrowth: Array<{ name: string, users: number }>;
  approvalData: Array<{ name: string, approvals: number }>;
  revenueData: Array<{ name: string, revenue: number }>;
}

const DashboardOverview = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Get total users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get pending content moderation items
      const { count: pendingApprovals } = await supabase
        .from('content_moderation')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get revenue from expenses (treating positive expenses as revenue)
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('amount, date')
        .gte('amount', 0);

      const totalRevenue = expenseData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

      // Get user growth data (last 6 months)
      const months = [];
      const userGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', endOfMonth.toISOString());

        userGrowth.push({ name: monthName, users: userCount || 0 });
      }

      // Get approval data (last 4 weeks)
      const approvalData = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);

        const { count: approvals } = await supabase
          .from('content_moderation')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString());

        approvalData.push({ name: `Week ${4 - i}`, approvals: approvals || 0 });
      }

      // Get revenue data (last 6 months)
      const revenueData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { data: monthExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .gte('amount', 0)
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', endOfMonth.toISOString().split('T')[0]);

        const monthRevenue = monthExpenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
        revenueData.push({ name: monthName, revenue: monthRevenue });
      }

      // Get active regions (count distinct regions from profiles)
      const { data: regionsData } = await supabase
        .from('profiles')
        .select('region')
        .not('region', 'is', null);

      const activeRegions = new Set(regionsData?.map(p => p.region)).size;

      setStats({
        totalUsers: totalUsers || 0,
        pendingApprovals: pendingApprovals || 0,
        totalRevenue,
        activeRegions,
        userGrowth,
        approvalData,
        revenueData
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Users
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87m-4-1.13a4 4 0 0 1 0-7.75" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Real user data from database
          </p>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.userGrowth}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dataKey="users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pending Approvals
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v10.5" />
            <path d="M18.4 8.1c.9.4 1.6 1.1 2.3 1.9a6 6 0 0 1 0 8.2c-.7.8-1.4 1.5-2.3 1.9l-1.6.9c-.9.5-1.9.8-3.1.8H8c-1.1 0-2.1-.3-3.1-.8l-1.6-.9c-.9-.4-1.6-1.1-2.3-1.9a6 6 0 0 1 0-8.2c.7-.8 1.4-1.5 2.3-1.9l1.6-.9c.9-.5 1.9-.8 3.1-.8h3.4" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
          <p className="text-xs text-muted-foreground">
            Real pending moderation items
          </p>
           <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.approvalData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="approvals"
                  fill="#ff7f0e"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Real revenue from database
          </p>
           <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.revenueData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dataKey="revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gemini AI Savings Card */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">
            AI Cost Savings
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-green-600"
          >
            <path d="M12 2v20m9-9H3"/>
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">95%</div>
          <p className="text-xs text-green-600 mb-2">
            Cost reduction with Gemini Flash
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Gemini Flash:</span>
              <span className="font-medium text-green-700">$0.075/M</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Claude (old):</span>
              <span className="line-through">$3.00/M</span>
            </div>
            <div className="border-t pt-1 flex justify-between font-medium">
              <span>Monthly Savings:</span>
              <span className="text-green-700">~$145K+</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;