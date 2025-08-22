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
import { Loader2, X, Check, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MobileIncomeFormProps {
  onClose: () => void;
  onAddIncome: (income: { amount: number; source: string; type: string; date: string; description?: string }) => Promise<boolean>;
}

export default function MobileIncomeForm({ onClose, onAddIncome }: MobileIncomeFormProps) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  
  const sources = ['Freelance', 'Part-time Job', 'Investment', 'Side Hustle', 'Other'];
  const { toast } = useToast();

  const steps = [
    { field: 'amount', label: 'How much did you earn?' },
    { field: 'source', label: 'Where did it come from?' },
    { field: 'description', label: 'What was it for?' },
    { field: 'date', label: 'When did you earn it?' },
    { field: 'recurring', label: 'Is this recurring income?' }
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
      case 'source':
        if (!source) {
          setErrors({ source: "Please select an income source" });
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
      const success = await onAddIncome({
        amount: parseFloat(amount),
        source,
        type: isRecurring ? 'recurring' : 'one-time',
        description,
        date: format(selectedDate!, 'yyyy-MM-dd'),
      });

      if (success) {
        toast({
          title: "Success!",
          description: "Income added successfully",
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add income. Please try again.",
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-green-600">$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-3xl h-16 pl-12 text-center text-green-600"
                  autoFocus
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-red-500 mt-2">{errors.amount}</p>
              )}
            </div>
          </div>
        );

      case 'source':
        return (
          <div className="space-y-4">
            <label className="text-2xl font-semibold block text-center mb-6">
              {step.label}
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {sources.map((src) => (
                <Button
                  key={src}
                  variant={source === src ? "default" : "outline"}
                  size="lg"
                  onClick={() => setSource(src)}
                  className="h-20 text-lg"
                >
                  {src}
                </Button>
              ))}
            </div>
            {errors.source && (
              <p className="text-sm text-red-500 text-center">{errors.source}</p>
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
                placeholder="e.g., Freelance web design project"
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

      case 'recurring':
        return (
          <div className="space-y-4">
            <label className="text-2xl font-semibold block text-center mb-6">
              {step.label}
            </label>
            <div className="max-w-md mx-auto space-y-4">
              <Button
                variant={isRecurring ? "default" : "outline"}
                size="lg"
                onClick={() => setIsRecurring(true)}
                className="w-full h-20 text-lg"
              >
                Yes, this is recurring
              </Button>
              <Button
                variant={!isRecurring ? "default" : "outline"}
                size="lg"
                onClick={() => setIsRecurring(false)}
                className="w-full h-20 text-lg"
              >
                No, one-time income
              </Button>
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
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Add Income
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted h-1">
        <div 
          className="bg-green-600 h-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {renderStepContent()}
      </div>

      {/* Actions */}
      <div className="p-4 border-t">
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
            className="flex-1 bg-green-600 hover:bg-green-700"
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
                Save Income
              </>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}