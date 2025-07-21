import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/common/AnimatedDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CreateListingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: () => void;
}

const categories = ["Electronics", "Furniture", "Parts", "Camping", "Tools", "Other"];
const conditions = ["Excellent", "Good", "Fair", "Poor"];

export default function CreateListingForm({ isOpen, onClose, onListingCreated }: CreateListingFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();

  const handleCreateListing = async () => {
    if (!user) {
      toast.error("You must be logged in to create a listing");
      return;
    }

    if (!title.trim() || !price.trim() || !category || !condition) {
      toast.error("Please fill in all required fields");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          price: priceNum,
          category,
          condition,
          location: location.trim() || 'Unknown',
          seller: `User ${user.id.substring(0, 5)}`,
          user_id: user.id,
          status: 'pending', // Pending approval
          posted: new Date().toLocaleDateString()
        });

      if (error) {
        console.error("Error creating listing:", error);
        toast.error("Failed to create listing");
        return;
      }

      toast.success("Listing created! It will be reviewed before appearing in the marketplace.");

      // Reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("");
      setCondition("");
      setLocation("");
      
      onClose();
      onListingCreated();
    } catch (err) {
      console.error("Error creating listing:", err);
      toast.error("Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you selling?"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Price *</label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Category *</label>
            <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Condition *</label>
            <Select value={condition} onValueChange={setCondition} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((cond) => (
                  <SelectItem key={cond} value={cond}>
                    {cond}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where are you located?"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item..."
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreateListing} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}