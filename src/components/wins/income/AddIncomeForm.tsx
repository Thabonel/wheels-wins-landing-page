
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

export default function AddIncomeForm() {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  
  const handleSubmit = () => {
    // Handle form submission logic here
    console.log({ amount, source, type, date });
    // Reset form
    setAmount("");
    setSource("");
    setType("");
    setDate("");
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
        <Button onClick={handleSubmit}>Save Income</Button>
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
