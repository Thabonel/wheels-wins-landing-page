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
import { AlertCircle, Loader2, X, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { receiptService } from "@/services/receiptService";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

interface MobileExpenseFormProps {
  onClose: () => void;
  presetCategory?: string;
}

export default function MobileExpenseForm({ onClose, presetCategory }: MobileExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(presetCategory || "");
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  
  const { addExpense, categories } = useExpenseActions();
  const { toast } = useToast();
  const { user } = useAuth();

  const steps = [
    { field: 'amount', label: 'How much did you spend?' },
    { field: 'category', label: 'What type of expense?' },
    { field: 'description', label: 'What was it for?' },
    { field: 'date', label: 'When did you spend it?' },
    { field: 'receipt', label: 'Do you have a receipt?' }
  ];

  const validateCurrentStep = () => {
    const step = steps[currentStep];
    let isValid = true;

    switch (step.field) {
      case 'amount':
        if (!amount || parseFloat(amount) <= 0) {
          setErrors({ amount: "Please enter a valid amount" });
          isValid = false;
        }
        break;
      case 'category':
        if (!category) {
          setErrors({ category: "Please select a category" });
          isValid = false;
        }
        break;
      case 'description':
        if (!description || description.trim().length < 3) {
          setErrors({ description: "Please enter a description (min 3 characters)" });
          isValid = false;
        }
        break;
      case 'date':
        if (!selectedDate) {
          setErrors({ date: "Please select a date" });
          isValid = false;
        }
        break;
    }

    return isValid;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        setErrors({});
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let receiptUrl = null;
      if (receipt && user) {
        try {
          const uploadResult = await receiptService.uploadReceipt(receipt);
          receiptUrl = uploadResult.receipt_url;
        } catch (error) {
          console.warn('Receipt upload failed:', error);
        }
      }

      const success = addExpense({
        amount: parseFloat(amount),
        category,
        description,
        date: format(selectedDate!, 'yyyy-MM-dd'),
        receiptUrl,
      });

      if (success) {
        toast({
          title: "Success!",
          description: "Expense added successfully",
        });
        onClose();
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

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.field) {
      case 'amount':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <label className="text-2xl font-semibold block mb-6">
                {step.label}
              </label>
              <div className="relative max-w-xs mx-auto">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl">$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-3xl h-16 pl-12 text-center"
                  autoFocus
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-red-500 mt-2">{errors.amount}</p>
              )}
            </div>
          </div>
        );

      case 'category':
        return (
          <div className="space-y-4">
            <label className="text-2xl font-semibold block text-center mb-6">
              {step.label}
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? "default" : "outline"}
                  size="lg"
                  onClick={() => setCategory(cat)}
                  className="h-20 text-lg"
                >
                  {cat}
                </Button>
              ))}
            </div>
            {errors.category && (
              <p className="text-sm text-red-500 text-center">{errors.category}</p>
            )}
          </div>
        );

      case 'description':
        return (
          <div className="space-y-4">
            <label className="text-2xl font-semibold block text-center mb-6">
              {step.label}
            </label>
            <div className="max-w-md mx-auto">
              <Input
                placeholder="e.g., Grocery shopping at Walmart"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xl h-14"
                autoFocus
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-2">{errors.description}</p>
              )}
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-4">
            <label className="text-2xl font-semibold block text-center mb-6">
              {step.label}
            </label>
            <div className="max-w-md mx-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="w-full h-14 text-lg"
                  >
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar 
                    mode="single" 
                    selected={selectedDate} 
                    onSelect={setSelectedDate} 
                    initialFocus 
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-sm text-red-500 mt-2">{errors.date}</p>
              )}
            </div>
          </div>
        );

      case 'receipt':
        return (
          <div className="space-y-4">
            <label className="text-2xl font-semibold block text-center mb-6">
              {step.label}
            </label>
            <div className="max-w-md mx-auto">
              <ReceiptUpload 
                onReceiptChange={setReceipt}
                className="mb-4"
              />
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Optional: Photos of receipts help with expense tracking and taxes
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Add Expense</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted h-1">
        <div 
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {renderStepContent()}
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-3">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              className="flex-1"
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleNext}
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                Save Expense
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
        
        {/* Skip for optional steps */}
        {currentStep === steps.length - 1 && !isSubmitting && (
          <Button
            variant="ghost"
            size="lg"
            onClick={handleSubmit}
            className="w-full"
          >
            Skip Receipt
          </Button>
        )}
      </div>
    </div>
  );
}