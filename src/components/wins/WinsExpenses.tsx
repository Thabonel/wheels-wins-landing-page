
import { useState } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardFooter, 
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Drawer, DrawerClose, DrawerContent, DrawerDescription, 
  DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function WinsExpenses() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("timeline");
  
  // Sample expenses data - in a real app this would come from an API/database
  const expensesData = [
    { id: 1, amount: 85.75, category: "Fuel", date: "May 2, 2025", description: "Diesel - Flying J" },
    { id: 2, amount: 62.38, category: "Food", date: "May 1, 2025", description: "Grocery store" },
    { id: 3, amount: 45.00, category: "Camp", date: "Apr 30, 2025", description: "State Park - 3 nights" },
    { id: 4, amount: 35.99, category: "Fun", date: "Apr 28, 2025", description: "Museum tickets" },
    { id: 5, amount: 148.32, category: "Fuel", date: "Apr 25, 2025", description: "Diesel - Pilot" },
    { id: 6, amount: 78.45, category: "Food", date: "Apr 24, 2025", description: "Grocery store" },
    { id: 7, amount: 22.99, category: "Other", date: "Apr 23, 2025", description: "Laundry" },
    { id: 8, amount: 30.00, category: "Fun", date: "Apr 21, 2025", description: "National Park pass" },
  ];
  
  // Category colors for visual identification
  const categoryColors = {
    "Fuel": "bg-purple-100 text-purple-800 border-purple-200",
    "Food": "bg-blue-100 text-blue-800 border-blue-200",
    "Camp": "bg-green-100 text-green-800 border-green-200",
    "Fun": "bg-amber-100 text-amber-800 border-amber-200",
    "Other": "bg-gray-100 text-gray-800 border-gray-200"
  };
  
  // Data transformed for bar chart
  const chartData = [
    { name: 'Fuel', amount: 234.07 },
    { name: 'Food', amount: 140.83 },
    { name: 'Camp', amount: 45.00 },
    { name: 'Fun', amount: 65.99 },
    { name: 'Other', amount: 22.99 },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs defaultValue="all" className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All Expenses</TabsTrigger>
            <TabsTrigger value="fuel">Fuel</TabsTrigger>
            <TabsTrigger value="food">Food</TabsTrigger>
            <TabsTrigger value="camp">Camp</TabsTrigger>
            <TabsTrigger value="fun">Fun</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === "timeline" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="rounded-none border-0"
            >
              Timeline
            </Button>
            <Button 
              variant={viewMode === "chart" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("chart")}
              className="rounded-none border-0"
            >
              Chart
            </Button>
          </div>
          
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Add New Expense</DrawerTitle>
                <DrawerDescription>
                  Record your travel expenses here
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 py-2">
                <form className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="amount">Amount ($)</label>
                    <Input id="amount" type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="category">Category</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fuel">Fuel</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="camp">Camp</SelectItem>
                        <SelectItem value="fun">Fun</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="description">Description</label>
                    <Input id="description" placeholder="What was this expense for?" />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="date">Date</label>
                    <Input id="date" type="date" />
                  </div>
                </form>
              </div>
              <DrawerFooter>
                <Button>Save Expense</Button>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {viewMode === "timeline" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Recent Expenses</span>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesData.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.date}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[expense.category as keyof typeof categoryColors]}`}>
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Showing 8 of 24 expenses
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>
              Your spending breakdown for the past 30 days
            </CardDescription>
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
                  <Bar 
                    dataKey="amount" 
                    name="Amount" 
                    barSize={50}
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => {
                      const colors = ['#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#6B7280'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="bg-blue-100 p-1 rounded-full">
              <img 
                src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
                alt="Pam"
                className="h-5 w-5 rounded-full"
              />
            </span>
            <span>Pam's Expense Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-900">
            Your fuel costs are 23% higher than last month. 
            I found three gas stations nearby with prices $0.30 lower than you've been paying.
            Want me to show you the route?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
