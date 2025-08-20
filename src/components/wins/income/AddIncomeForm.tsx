
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddIncomeFormProps {
  onAddIncome: (income: { amount: number; source: string; type: string; date: string; description?: string }) => Promise<boolean>;
  onClose: () => void;
}

export default function AddIncomeForm({ onAddIncome, onClose }: AddIncomeFormProps) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [type, setType] = useState("regular");
  const [date, setDate] = useState<Date>(new Date());
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
      date: format(date, 'yyyy-MM-dd'),
      description: description || undefined
    });

    if (success) {
      // Reset form
      setAmount("");
      setSource("");
      setType("regular");
      setDate(new Date());
      setDescription("");
      onClose();
    }
    
    setIsSubmitting(false);
  };
  
  return (
    <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Add Income</h2>
          <p className="text-sm text-muted-foreground">Record a new income entry for your travel budget</p>
        </div>
        
        <form className="grid gap-4">
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </form>
        
        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial"
          >
            {isSubmitting ? "Saving..." : "Save Income"}
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
        </div>
    </div>
  );
}
