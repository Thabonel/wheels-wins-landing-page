import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Download, TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";
import { DateRange } from "react-day-picker";

interface AnalyticsData {
  userGrowth: Array<{ month: string, users: number, newUsers: number }>;
  revenue: Array<{ month: string, revenue: number, orders: number }>;
  usersByRegion: Array<{ region: string, count: number, percentage: number }>;
  topProducts: Array<{ name: string, sales: number, revenue: number }>;
  orderStatus: Array<{ status: string, count: number, percentage: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportsAnalytics = () => {
  // Mock analytics data - no authentication required
  const mockAnalyticsData: AnalyticsData = {
    userGrowth: [
      { month: 'Jan 2024', users: 120, newUsers: 45 },
      { month: 'Feb 2024', users: 180, newUsers: 60 },
      { month: 'Mar 2024', users: 250, newUsers: 70 },
      { month: 'Apr 2024', users: 320, newUsers: 70 },
      { month: 'May 2024', users: 410, newUsers: 90 },
      { month: 'Jun 2024', users: 520, newUsers: 110 }
    ],
    revenue: [
      { month: 'Jan 2024', revenue: 4500, orders: 45 },
      { month: 'Feb 2024', revenue: 6200, orders: 58 },
      { month: 'Mar 2024', revenue: 7800, orders: 72 },
      { month: 'Apr 2024', revenue: 9100, orders: 89 },
      { month: 'May 2024', revenue: 11400, orders: 102 },
      { month: 'Jun 2024', revenue: 13800, orders: 125 }
    ],
    usersByRegion: [
      { region: 'North America', count: 250, percentage: 48 },
      { region: 'Europe', count: 130, percentage: 25 },
      { region: 'Asia Pacific', count: 90, percentage: 17 },
      { region: 'South America', count: 35, percentage: 7 },
      { region: 'Africa', count: 15, percentage: 3 }
    ],
    topProducts: [
      { name: 'Travel Backpack Pro', sales: 85, revenue: 4250 },
      { name: 'Camping Tent Deluxe', sales: 62, revenue: 3720 },
      { name: 'Hiking Boots Elite', sales: 74, revenue: 5180 },
      { name: 'Portable Charger Max', sales: 91, revenue: 2730 },
      { name: 'Weather Jacket Plus', sales: 53, revenue: 3180 }
    ],
    orderStatus: [
      { status: 'completed', count: 380, percentage: 65 },
      { status: 'pending', count: 120, percentage: 21 },
      { status: 'shipped', count: 65, percentage: 11 },
      { status: 'cancelled', count: 18, percentage: 3 }
    ]
  };

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(mockAnalyticsData);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedMetric, setSelectedMetric] = useState('users');
  
  const fetchAnalyticsData = async () => {
    // Mock refresh - simulate loading
    setLoading(true);
    setTimeout(() => {
      setAnalyticsData(mockAnalyticsData);
      setLoading(false);
      toast.success("Analytics data refreshed");
    }, 1000);
  };

  const exportData = (format: 'csv' | 'json') => {
    if (!analyticsData) return;
    
    const dataToExport = {
      userGrowth: analyticsData.userGrowth,
      revenue: analyticsData.revenue,
      usersByRegion: analyticsData.usersByRegion,
      topProducts: analyticsData.topProducts,
      orderStatus: analyticsData.orderStatus,
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else {
      // Simple CSV export for user growth
      const csv = [
        'Month,Users,New Users,Revenue,Orders',
        ...analyticsData.userGrowth.map(item => {
          const revenueItem = analyticsData.revenue.find(r => r.month === item.month);
          return `${item.month},${item.users},${item.newUsers},${revenueItem?.revenue || 0},${revenueItem?.orders || 0}`;
        })
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
    
    toast.success(`Analytics data exported as ${format.toUpperCase()}`);
  };

  useEffect(() => {
    // Initialize with mock data
    setAnalyticsData(mockAnalyticsData);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm">Comprehensive business insights and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnalyticsData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportData('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="orders">Orders</SelectItem>
                <SelectItem value="regions">Regions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {analyticsData && (
        <>
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.userGrowth.reduce((sum, item) => sum + item.users, 0)}
                    </p>
                    <p className="text-sm text-gray-600">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      ${analyticsData.revenue.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.revenue.reduce((sum, item) => sum + item.orders, 0)}
                    </p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {analyticsData.usersByRegion.length}
                    </p>
                    <p className="text-sm text-gray-600">Active Regions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" fill="#8884d8" name="Total Users" />
                    <Bar dataKey="newUsers" fill="#82ca9d" name="New Users" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'revenue' ? `$${value}` : value,
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue ($)" />
                    <Line type="monotone" dataKey="orders" stroke="#8884d8" name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Users by Region */}
            <Card>
              <CardHeader>
                <CardTitle>Users by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.usersByRegion}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ region, percentage }) => `${region} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.usersByRegion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.orderStatus.map((status, index) => (
                    <div key={status.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="capitalize">{status.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{status.count}</Badge>
                        <span className="text-sm text-gray-500">{status.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Product Name</th>
                      <th className="text-left p-2">Sales</th>
                      <th className="text-left p-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topProducts.map((product, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{product.name}</td>
                        <td className="p-2">{product.sales}</td>
                        <td className="p-2">${product.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ReportsAnalytics;
