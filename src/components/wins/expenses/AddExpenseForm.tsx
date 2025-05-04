
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useExpenseActions } from "@/hooks/useExpenseActions";

interface AddExpenseFormProps {
  onClose?: () => void;
}

export default function AddExpenseForm({ onClose }: AddExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const { addExpense, categories } = useExpenseActions();
  
  const handleSubmit = () => {
    if (!amount || !category || !description || !date) {
      return;
    }
    
    const success = addExpense({
      amount: parseFloat(amount),
      category,
      description,
      date,
    });
    
    if (success) {
      // Reset form
      setAmount("");
      setCategory("");
      setDescription("");
      setDate("");
      
      // Close drawer
      if (onClose) {
        onClose();
      }
    }
  };
  
  return (
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
            <Input 
              id="amount" 
              type="number" 
              step="0.01" 
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="category">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="description">Description</label>
            <Input 
              id="description" 
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="date">Date</label>
            <Input 
              id="date" 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>
        </form>
      </div>
      <DrawerFooter>
        <Button onClick={handleSubmit}>Save Expense</Button>
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
