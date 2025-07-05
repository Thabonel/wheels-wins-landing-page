import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";

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
  
  const { user: clerkUser, isSignedIn } = useUser();
  const isAdmin = clerkUser?.primaryEmailAddress?.emailAddress === 'thabonel0@gmail.com';

  const fetchDashboardStats = async () => {
    if (!isSignedIn || !isAdmin) return;
    
    setLoading(true);
    try {
      // Fetch admin users
      const { data: adminUsers } = await supabase.rpc('admin_get_users');
      
      // Fetch flagged content for pending approvals
      const { data: flaggedContent } = await supabase.rpc('admin_get_flagged_content');
      
      // Fetch shop orders for revenue (if table exists)
      const { data: orders } = await supabase
        .from('shop_orders')
        .select('created_at, total_amount, status')
        .order('created_at');

      // Process user growth data by month
      const userGrowthMap = new Map<string, number>();
      adminUsers?.forEach((user: any) => {
        const month = new Date(user.created_at).toLocaleDateString('en-US', { 
          month: 'short' 
        });
        userGrowthMap.set(month, (userGrowthMap.get(month) || 0) + 1);
      });

      const userGrowth = Array.from(userGrowthMap.entries()).map(([name, users]) => ({
        name, users
      }));

      // Process approval data by week
      const approvalMap = new Map<string, number>();
      const now = new Date();
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7));
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        
        const weekApprovals = flaggedContent?.filter((content: any) => {
          const contentDate = new Date(content.created_at);
          return contentDate >= weekStart && contentDate <= weekEnd;
        }).length || 0;
        
        approvalMap.set(`Week ${4-i}`, weekApprovals);
      }

      const approvalData = Array.from(approvalMap.entries()).map(([name, approvals]) => ({
        name, approvals
      }));

      // Process revenue data by month
      const revenueMap = new Map<string, number>();
      orders?.forEach((order: any) => {
        const month = new Date(order.created_at).toLocaleDateString('en-US', { 
          month: 'short' 
        });
        revenueMap.set(month, (revenueMap.get(month) || 0) + order.total_amount);
      });

      const revenueData = Array.from(revenueMap.entries()).map(([name, revenue]) => ({
        name, revenue
      }));

      // Get unique regions
      const uniqueRegions = new Set(adminUsers?.map((user: any) => user.region).filter(Boolean));

      setStats({
        totalUsers: adminUsers?.length || 0,
        pendingApprovals: flaggedContent?.filter((content: any) => content.status === 'pending').length || 0,
        totalRevenue: orders?.reduce((sum: number, order: any) => sum + order.total_amount, 0) || 0,
        activeRegions: uniqueRegions.size,
        userGrowth: userGrowth.length > 0 ? userGrowth : [
          { name: "Jan", users: 0 },
          { name: "Feb", users: 0 },
          { name: "Mar", users: 0 },
          { name: "Apr", users: 0 },
          { name: "May", users: 0 },
          { name: "Jun", users: 0 },
        ],
        approvalData: approvalData.length > 0 ? approvalData : [
          { name: "Week 1", approvals: 0 },
          { name: "Week 2", approvals: 0 },
          { name: "Week 3", approvals: 0 },
          { name: "Week 4", approvals: 0 },
        ],
        revenueData: revenueData.length > 0 ? revenueData : [
          { name: "Jan", revenue: 0 },
          { name: "Feb", revenue: 0 },
          { name: "Mar", revenue: 0 },
          { name: "Apr", revenue: 0 },
          { name: "May", revenue: 0 },
          { name: "Jun", revenue: 0 },
        ]
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && isAdmin) {
      fetchDashboardStats();
    }
  }, [isSignedIn, isAdmin]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Unable to load dashboard data</p>
        <Button onClick={fetchDashboardStats} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4">
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
            Real user data
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
            Pending content moderation
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
            Total shop revenue
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
    </div>
  );
};

export default DashboardOverview;