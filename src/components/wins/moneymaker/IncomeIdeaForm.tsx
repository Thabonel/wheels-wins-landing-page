
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  DrawerClose, DrawerContent, DrawerDescription, 
  DrawerFooter, DrawerHeader, DrawerTitle 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface IncomeIdeaFormProps {
  onAddIdea: (idea: {
    name: string;
    description: string;
    category: string;
    monthlyIncome: number;
    status: string;
  }) => Promise<boolean>;
  onClose: () => void;
}

export default function IncomeIdeaForm({ onAddIdea, onClose }: IncomeIdeaFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("online");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [status, setStatus] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !category) {
      return;
    }

    setIsSubmitting(true);
    
    const success = await onAddIdea({
      name,
      description,
      category,
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      status
    });

    if (success) {
      // Reset form
      setName("");
      setDescription("");
      setCategory("online");
      setMonthlyIncome("");
      setStatus("active");
      onClose();
    }
    
    setIsSubmitting(false);
  };

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Add New Income Source</DrawerTitle>
        <DrawerDescription>
          Track a new way you're making money while traveling
        </DrawerDescription>
      </DrawerHeader>
      <div className="px-4 py-2">
        <form className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="idea-name">Name</label>
            <Input 
              id="idea-name" 
              placeholder="What is this income source?"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="category">Category</label>
            <select 
              id="category" 
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="online">Online Work</option>
              <option value="services">Services</option>
              <option value="crafts">Crafts & Sales</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="status">Status</label>
            <select 
              id="status" 
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="planning">Planning</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="monthly-income">Monthly Income ($)</label>
            <Input 
              id="monthly-income" 
              type="number" 
              placeholder="0"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="notes">Description</label>
            <textarea 
              id="notes" 
              rows={3}
              placeholder="Additional details about this income source"
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
        </form>
      </div>
      <DrawerFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Income Source"}
        </Button>
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
