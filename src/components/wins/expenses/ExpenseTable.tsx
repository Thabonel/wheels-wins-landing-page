
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
import { Filter } from "lucide-react";

export interface ExpenseItem {
  id: number;
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface ExpenseTableProps {
  expenses: ExpenseItem[];
  categoryColors: Record<string, string>;
  onFilterClick: () => void;
}

export default function ExpenseTable({ 
  expenses, 
  categoryColors,
  onFilterClick 
}: ExpenseTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Recent Expenses</span>
          <Button variant="outline" size="sm" className="h-8" onClick={onFilterClick}>
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
            {expenses.map((expense) => (
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
          Showing {expenses.length} of 24 expenses
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardFooter>
    </Card>
  );
}
