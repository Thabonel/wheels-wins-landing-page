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
import SmartReceiptScanner from "@/components/shared/SmartReceiptScanner";
import { type UniversalExtractedData } from "@/hooks/useReceiptScanner";
import { Loader2, X, Check, Camera, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MobileExpenseFormProps {
  onClose: () => void;
  presetCategory?: string;
}

type WizardMode = "choose" | "scan" | "manual" | "review";

export default function MobileExpenseForm({ onClose, presetCategory }: MobileExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(presetCategory || "");
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [mode, setMode] = useState<WizardMode>("choose");

  const { addExpense, categories } = useExpenseActions();
  const { toast } = useToast();

  // Manual wizard steps (amount -> category -> description -> date)
  const manualSteps = [
    { field: 'amount', label: 'How much did you spend?' },
    { field: 'category', label: 'What type of expense?' },
    { field: 'description', label: 'What was it for?' },
    { field: 'date', label: 'When did you spend it?' },
  ];

  const handleScanExtracted = (data: UniversalExtractedData) => {
    if (data.total) setAmount(data.total.toString());
    if (data.suggested_category && categories.includes(data.suggested_category)) {
      setCategory(data.suggested_category);
    }
    if (data.vendor || data.description) {
      setDescription([data.vendor, data.description].filter(Boolean).join(' - '));
    }
    if (data.date) {
      const parsed = new Date(data.date + 'T00:00:00');
      if (!isNaN(parsed.getTime())) setSelectedDate(parsed);
    }
    // Jump to review mode after scan
    setMode("review");
  };

  const validateCurrentStep = () => {
    const step = manualSteps[currentStep];
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
      if (currentStep < manualSteps.length - 1) {
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
    } else {
      setMode("choose");
    }
  };

  const validateReview = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = "Required";
    if (!category) newErrors.category = "Required";
    if (!description || description.trim().length < 3) newErrors.description = "Min 3 characters";
    if (!selectedDate) newErrors.date = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (mode === "review" && !validateReview()) return;

    setIsSubmitting(true);

    try {
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
    } catch {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    // Step 0: Choose mode - scan or manual
    if (mode === "choose") {
      return (
        <div className="space-y-6 text-center">
          <label className="text-2xl font-semibold block">
            Add an Expense
          </label>
          <p className="text-muted-foreground">
            How would you like to enter this expense?
          </p>
          <div className="flex flex-col gap-4 max-w-xs mx-auto">
            <Button
              size="lg"
              onClick={() => setMode("scan")}
              className="h-20 text-lg bg-[#C67B4B] hover:bg-[#B06A3A] text-white"
            >
              <Camera className="mr-3 h-6 w-6" />
              Scan Receipt
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setMode("manual")}
              className="h-20 text-lg"
            >
              <PenLine className="mr-3 h-6 w-6" />
              Enter Manually
            </Button>
          </div>
        </div>
      );
    }

    // Scan mode - show SmartReceiptScanner
    if (mode === "scan") {
      return (
        <div className="space-y-4 w-full max-w-md mx-auto">
          <label className="text-2xl font-semibold block text-center mb-6">
            Scan Your Receipt
          </label>
          <SmartReceiptScanner
            onExtracted={handleScanExtracted}
            onReceiptUploaded={(url) => setReceiptUrl(url)}
          />
          <Button
            variant="ghost"
            onClick={() => setMode("manual")}
            className="w-full text-muted-foreground"
          >
            Enter manually instead
          </Button>
        </div>
      );
    }

    // Review mode - show all auto-filled fields for verification
    if (mode === "review") {
      return (
        <div className="space-y-4 w-full max-w-md mx-auto">
          <label className="text-2xl font-semibold block text-center mb-4">
            Verify Details
          </label>
          <p className="text-sm text-center text-muted-foreground mb-4">
            Review the scanned data and make any corrections
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this expense for?"
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
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
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
          </div>
        </div>
      );
    }

    // Manual step-by-step wizard
    const step = manualSteps[currentStep];

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

      default:
        return null;
    }
  };

  const totalSteps = mode === "manual" ? manualSteps.length : 1;
  const progressStep = mode === "choose" ? 0
    : mode === "scan" ? 0.5
    : mode === "review" ? 1
    : currentStep + 1;

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
        <div className="w-10" />
      </div>

      {/* Progress bar */}
      {mode !== "choose" && (
        <div className="w-full bg-muted h-1">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(progressStep / totalSteps) * 100}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {renderContent()}
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-3">
        {mode === "choose" && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        )}

        {mode === "scan" && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setMode("choose")}
            className="w-full"
          >
            Back
          </Button>
        )}

        {mode === "review" && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setMode("scan")}
              className="flex-1"
              disabled={isSubmitting}
            >
              Rescan
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Save Expense
                </>
              )}
            </Button>
          </div>
        )}

        {mode === "manual" && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              className="flex-1"
              disabled={isSubmitting}
            >
              Back
            </Button>
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
              ) : currentStep === manualSteps.length - 1 ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Save Expense
                </>
              ) : (
                'Next'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
