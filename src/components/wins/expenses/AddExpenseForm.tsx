
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpenseActions } from "@/hooks/useExpenseActions";
import ReceiptUpload from "./ReceiptUpload";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { receiptService } from "@/services/receiptService";
import { useAuth } from "@/context/AuthContext";

import { format } from "date-fns";

interface AddExpenseFormProps {
  onClose?: () => void;
  presetCategory?: string;
  startWithReceipt?: boolean;
  startWithVoice?: boolean;
}

export default function AddExpenseForm({ onClose, presetCategory, startWithReceipt, startWithVoice }: AddExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(presetCategory || "");
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shouldOpenReceipt, setShouldOpenReceipt] = useState(startWithReceipt || false);
  
  const { addExpense, categories } = useExpenseActions();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if we should open receipt upload on mount (for backward compatibility)
  useState(() => {
    if (!startWithReceipt && typeof window !== 'undefined' && sessionStorage.getItem('openReceiptUpload') === 'true') {
      setShouldOpenReceipt(true);
      // Don't remove it here as WinsExpenses handles it
    }
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }
    
    if (!category) {
      newErrors.category = "Please select a category";
    }
    
    if (!description || description.trim().length < 3) {
      newErrors.description = "Please enter a description (min 3 characters)";
    }
    
    if (!selectedDate) {
      newErrors.date = "Please select a date";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // If there's a receipt, upload it first
      let receiptUrl = null;
      if (receipt && user) {
        try {
          // Try API upload first
          const uploadResult = await receiptService.uploadReceipt(receipt);
          receiptUrl = uploadResult.receipt_url;
        } catch (apiError) {
          console.warn('API upload failed, trying direct upload:', apiError);
          // Fallback to direct Supabase upload
          try {
            receiptUrl = await receiptService.uploadReceiptDirect(receipt, user.id);
          } catch (directError) {
            console.error('Direct upload also failed:', directError);
            toast({
              title: "Warning",
              description: "Receipt upload failed, but expense will be saved",
              variant: "destructive"
            });
          }
        }
      }

      const success = addExpense({
        amount: parseFloat(amount),
        category,
        description,
        date: format(selectedDate!, 'yyyy-MM-dd'),
        receiptUrl, // This will be added to the expense data
      });

      if (success) {
        toast({
          title: "Success!",
          description: "Expense added successfully",
        });
        
        // Reset form
        setAmount("");
        setCategory("");
        setDescription("");
        setSelectedDate(new Date());
        setReceipt(null);
        setErrors({});
        
        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
        <form className="grid gap-4 py-4">
          {/* Amount Input */}
          <div className="grid gap-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount ($) <span className="text-red-500">*</span>
            </label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) {
                  setErrors(prev => ({ ...prev, amount: '' }));
                }
              }}
              className={errors.amount ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Category Select */}
          <div className="grid gap-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <Select 
              value={category} 
              onValueChange={(value) => {
                setCategory(value);
                if (errors.category) {
                  setErrors(prev => ({ ...prev, category: '' }));
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger className={errors.category ? "border-red-500" : ""}>
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
            {errors.category && (
              <p className="text-xs text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Description Input */}
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </label>
            <Input
              id="description"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: '' }));
                }
              }}
              className={errors.description ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Date Picker */}
          <div className="grid gap-2">
            <label htmlFor="date" className="text-sm font-medium">
              Date <span className="text-red-500">*</span>
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`w-full justify-start text-left font-normal ${!selectedDate ? "text-muted-foreground" : ""} ${errors.date ? "border-red-500" : ""}`}
                  disabled={isSubmitting}
                >
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar 
                  mode="single" 
                  selected={selectedDate} 
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (errors.date) {
                      setErrors(prev => ({ ...prev, date: '' }));
                    }
                  }} 
                  initialFocus 
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-xs text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Receipt Upload */}
          <ReceiptUpload 
            onReceiptChange={setReceipt}
            className="mt-2"
          />
        </form>

        {/* Info Alert */}
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Pro tip: Take photos of receipts for easy expense tracking and tax purposes!
          </AlertDescription>
        </Alert>
      
        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Expense"
            )}
          </Button>
          <Button 
            variant="outline" 
            disabled={isSubmitting} 
            onClick={onClose}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
        </div>
    </div>
  );
}
