import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { RefreshCw } from 'lucide-react';

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
  // Mock data for now - no Supabase calls
  const [stats] = useState<DashboardStats>({
    totalUsers: 150,
    pendingApprovals: 3,
    totalRevenue: 2450,
    activeRegions: 5,
    userGrowth: [
      { name: "Jan", users: 20 },
      { name: "Feb", users: 35 },
      { name: "Mar", users: 45 },
      { name: "Apr", users: 80 },
      { name: "May", users: 120 },
      { name: "Jun", users: 150 },
    ],
    approvalData: [
      { name: "Week 1", approvals: 2 },
      { name: "Week 2", approvals: 1 },
      { name: "Week 3", approvals: 4 },
      { name: "Week 4", approvals: 3 },
    ],
    revenueData: [
      { name: "Jan", revenue: 400 },
      { name: "Feb", revenue: 650 },
      { name: "Mar", revenue: 890 },
      { name: "Apr", revenue: 1200 },
      { name: "May", revenue: 1800 },
      { name: "Jun", revenue: 2450 },
    ]
  });

  const [loading] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
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
            Mock data - no auth required
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
            Mock pending content
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
            Mock shop revenue
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