
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

interface AddIncomeFormProps {
  onAddIncome: (income: { amount: number; source: string; type: string; date: string; description?: string }) => Promise<boolean>;
  onClose: () => void;
}

export default function AddIncomeForm({ onAddIncome, onClose }: AddIncomeFormProps) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [type, setType] = useState("regular");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!amount || !source || !type || !date) {
      return;
    }

    setIsSubmitting(true);
    
    const success = await onAddIncome({
      amount: parseFloat(amount),
      source,
      type,
      date,
      description: description || undefined
    });

    if (success) {
      // Reset form
      setAmount("");
      setSource("");
      setType("regular");
      setDate(new Date().toISOString().split('T')[0]);
      setDescription("");
      onClose();
    }
    
    setIsSubmitting(false);
  };
  
  return (
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
            <label htmlFor="source">Source</label>
            <Input 
              id="source" 
              placeholder="Where did this income come from?"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="type">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select income type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Work</SelectItem>
                <SelectItem value="side-hustle">Side Hustle</SelectItem>
                <SelectItem value="passive">Passive Income</SelectItem>
                <SelectItem value="content">Content Creation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="description">Description (Optional)</label>
            <Input 
              id="description" 
              placeholder="Additional details"
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
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Income"}
        </Button>
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
