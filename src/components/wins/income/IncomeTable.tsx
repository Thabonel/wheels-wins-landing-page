
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardFooter, 
  CardTitle 
} from "@/components/ui/card";

export interface IncomeItem {
  id: string; // Changed from number to string to match IncomeEntry
  amount: number;
  source: string;
  date: string;
  type: string;
  description?: string;
}

interface IncomeTableProps {
  incomeData: IncomeItem[];
  sourceColors: Record<string, string>;
}

export default function IncomeTable({ 
  incomeData, 
  sourceColors
}: IncomeTableProps) {
  return (
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
          Showing {incomeData.length} entries
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardFooter>
    </Card>
  );
}
