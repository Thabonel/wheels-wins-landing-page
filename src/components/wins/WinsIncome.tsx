
import { useState } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardFooter 
} from "@/components/ui/card";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PlusCircle, TrendingUp } from "lucide-react";

export default function WinsIncome() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Sample income data - in a real app this would come from an API/database
  const incomeData = [
    { id: 1, amount: 350.00, source: "Freelance Design", date: "May 3, 2025", type: "Side Hustle" },
    { id: 2, amount: 200.00, source: "Gumroad Sales", date: "May 3, 2025", type: "Side Hustle" },
    { id: 3, amount: 1200.00, source: "Remote Contract", date: "May 1, 2025", type: "Work" },
    { id: 4, amount: 75.00, source: "Etsy Shop", date: "Apr 29, 2025", type: "Side Hustle" },
    { id: 5, amount: 42.50, source: "Affiliate Sales", date: "Apr 28, 2025", type: "Passive" },
    { id: 6, amount: 50.00, source: "Blog Sponsorship", date: "Apr 25, 2025", type: "Content" },
    { id: 7, amount: 1200.00, source: "Remote Contract", date: "Apr 1, 2025", type: "Work" },
  ];
  
  // Income source colors for visual identification
  const sourceColors = {
    "Work": "bg-blue-100 text-blue-800 border-blue-200",
    "Side Hustle": "bg-purple-100 text-purple-800 border-purple-200",
    "Passive": "bg-green-100 text-green-800 border-green-200",
    "Content": "bg-amber-100 text-amber-800 border-amber-200"
  };
  
  // Calculate total income
  const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
  
  // Chart data - in a real app this would be more extensive
  const chartData = [
    { name: 'Jan', income: 1200 },
    { name: 'Feb', income: 1400 },
    { name: 'Mar', income: 1300 },
    { name: 'Apr', income: 2500 },
    { name: 'May', income: 1900 },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Your Income</h2>
        
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Add New Income</DrawerTitle>
              <DrawerDescription>
                Record money you've earned while traveling
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-2">
              <form className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="amount">Amount ($)</label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="source">Source</label>
                  <Input id="source" placeholder="Where did this income come from?" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="type">Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select income type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="side-hustle">Side Hustle</SelectItem>
                      <SelectItem value="passive">Passive Income</SelectItem>
                      <SelectItem value="content">Content Creation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="date">Date</label>
                  <Input id="date" type="date" />
                </div>
              </form>
            </div>
            <DrawerFooter>
              <Button>Save Income</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalIncome.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
              <TrendingUp className="h-4 w-4" />
              <span>+12% from last year</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Monthly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,462.00</div>
            <p className="text-xs text-muted-foreground mt-1">Based on last 6 months</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Side Hustle Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$625.00</div>
            <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
              <TrendingUp className="h-4 w-4" />
              <span>+35% monthly growth</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
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

      <Card>
        <CardHeader>
          <CardTitle>Income History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeData.map((income) => (
                <TableRow key={income.id}>
                  <TableCell className="font-medium">{income.date}</TableCell>
                  <TableCell>{income.source}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${sourceColors[income.type as keyof typeof sourceColors]}`}>
                      {income.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">${income.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing 7 of 15 entries
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardFooter>
      </Card>
      
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
            <span>Pam's Income Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-900">
            Your freelance income is growing steadily! Based on your current trajectory, 
            you could increase your revenue by focusing more on design work, 
            which earns you 3x more per hour than your other gigs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
