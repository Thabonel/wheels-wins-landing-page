
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  DrawerClose, DrawerContent, DrawerDescription, 
  DrawerFooter, DrawerHeader, DrawerTitle 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface TipShareFormProps {
  onAddTip: (tip: {
    title: string;
    content: string;
    category: string;
    savingsAmount?: number;
    isShared: boolean;
  }) => Promise<boolean>;
  onClose: () => void;
}

export default function TipShareForm({ onAddTip, onClose }: TipShareFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [savingsAmount, setSavingsAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title || !content || !category) {
      return;
    }

    setIsSubmitting(true);
    
    const success = await onAddTip({
      title,
      content,
      category,
      savingsAmount: savingsAmount ? parseFloat(savingsAmount) : undefined,
      isShared: true
    });

    if (success) {
      // Reset form
      setTitle("");
      setContent("");
      setCategory("");
      setSavingsAmount("");
      onClose();
    }
    
    setIsSubmitting(false);
  };

  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Share a Money-Saving Tip</DrawerTitle>
        <DrawerDescription>
          Help fellow travelers save money on the road
        </DrawerDescription>
      </DrawerHeader>
      <div className="px-4 py-2">
        <form className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="tip-title">Title</label>
            <Input 
              id="tip-title" 
              placeholder="Give your tip a clear title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="tip-category">Category</label>
            <select 
              id="tip-category" 
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category</option>
              <option value="Fuel Savings">Fuel Savings</option>
              <option value="Food & Groceries">Food & Groceries</option>
              <option value="Camping Deals">Camping Deals</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other Savings">Other Savings</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="savings-amount">Estimated Savings ($) - Optional</label>
            <Input 
              id="savings-amount" 
              type="number"
              placeholder="How much could this save?"
              value={savingsAmount}
              onChange={(e) => setSavingsAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="tip-content">Your Tip</label>
            <textarea 
              id="tip-content" 
              rows={4}
              placeholder="Describe your money-saving tip in detail"
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
          </div>
        </form>
      </div>
      <DrawerFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Tip"}
        </Button>
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
