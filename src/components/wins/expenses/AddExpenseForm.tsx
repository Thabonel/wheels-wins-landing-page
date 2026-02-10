
import { useState, useEffect } from "react";
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
import { AlertCircle, Loader2, Mic, MicOff, Volume2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

import { format } from "date-fns";

interface AddExpenseFormProps {
  onClose?: () => void;
  presetCategory?: string;
  startWithReceipt?: boolean;
  startWithVoice?: boolean;
}

export default function AddExpenseForm({ onClose, presetCategory, startWithVoice }: AddExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(presetCategory || "");
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [voiceEnabled, setVoiceEnabled] = useState(startWithVoice || false);
  
  const { addExpense, categories } = useExpenseActions();
  const { toast } = useToast();
  
  // Voice commands integration - but with form-only mode
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Initialize voice recognition when enabled
  useEffect(() => {
    if (!voiceEnabled) {
      setIsListening(false);
      setTranscript('');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive"
      });
      setVoiceEnabled(false);
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const currentTranscript = event.results[last][0].transcript;
      setTranscript(currentTranscript);
      
      if (event.results[last].isFinal) {
        parseAndFillForm(currentTranscript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      if (voiceEnabled) {
        setTimeout(() => {
          try {
            recognition.start();
            setIsListening(true);
          } catch (e) {
            console.error('Failed to restart recognition:', e);
          }
        }, 500);
      }
    };
    
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [voiceEnabled]);
  
  const parseAndFillForm = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    // Parse amount - look for numbers followed by dollars/bucks
    const amountMatch = command.match(/(\d+(?:\.\d{2})?)/i);
    if (amountMatch) {
      setAmount(amountMatch[1]);
      if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
    }
    
    // Parse category based on keywords
    const categoryKeywords = {
      'Food': ['food', 'restaurant', 'meal', 'lunch', 'dinner', 'breakfast', 'coffee', 'snack'],
      'Fuel': ['gas', 'fuel', 'gasoline', 'petrol', 'station'],
      'Lodging': ['hotel', 'motel', 'accommodation', 'lodge', 'stay'],
      'Transportation': ['toll', 'parking', 'uber', 'taxi', 'bus', 'train'],
      'Entertainment': ['movie', 'show', 'ticket', 'entertainment'],
      'Shopping': ['shop', 'store', 'buy', 'purchase'],
      'Other': []
    };
    
    let foundCategory = 'Other';
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerCommand.includes(keyword))) {
        foundCategory = cat;
        break;
      }
    }
    
    if (categories.includes(foundCategory)) {
      setCategory(foundCategory);
      if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
    }
    
    // Parse description - everything after "for"
    const forMatch = command.match(/for (.+)$/i);
    if (forMatch) {
      setDescription(forMatch[1]);
      if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
    }
    
    toast({
      title: "Voice command processed",
      description: "Form fields have been filled from your voice input",
      duration: 3000
    });
  };
  
  const handleReceiptExtracted = (data: UniversalExtractedData) => {
    if (data.total) {
      setAmount(data.total.toString());
      if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
    }
    if (data.suggested_category && categories.includes(data.suggested_category)) {
      setCategory(data.suggested_category);
      if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
    }
    if (data.vendor || data.description) {
      const desc = [data.vendor, data.description].filter(Boolean).join(' - ');
      setDescription(desc);
      if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
    }
    if (data.date) {
      const parsed = new Date(data.date + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
        if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
      }
    }
  };

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
        
        // Reset form
        setAmount("");
        setCategory("");
        setDescription("");
        setSelectedDate(new Date());
        setReceiptUrl(null);
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

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    
    if (newState) {
      toast({
        title: "Voice entry activated",
        description: "Say 'log [amount] dollars for [category]' to add expenses",
        duration: 4000
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Add Expense</h2>
        <p className="text-sm text-muted-foreground">Track your travel expenses and keep your budget on track</p>
      </div>
      
      {/* Voice Controls - Show when startWithVoice is true */}
      {startWithVoice && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Voice Entry Mode</span>
            </div>
            <Button
              type="button"
              onClick={toggleVoice}
              variant={voiceEnabled ? "default" : "outline"}
              size="sm"
              className={voiceEnabled ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {voiceEnabled ? (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  {isListening ? "Listening..." : "Voice On"}
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Enable Voice
                </>
              )}
            </Button>
          </div>
          
          {/* Voice Status and Transcript */}
          {voiceEnabled && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                {isListening && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                <span>
                  {isListening ? "Listening for commands..." : "Voice ready - start speaking"}
                </span>
              </div>
              
              {transcript && (
                <div className="bg-white dark:bg-gray-800 border rounded p-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Heard:</p>
                  <p className="text-sm italic">"{transcript}"</p>
                </div>
              )}
              
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <p className="font-medium mb-1">Try saying:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-500 dark:text-blue-400">
                  <li>"Log 25 dollars for gas"</li>
                  <li>"Add 15 bucks for food"</li>
                  <li>"Expense 8.50 for coffee"</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      
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

          {/* Receipt Scanner - auto-fills form fields from scanned data */}
          <div className="grid gap-2 mt-2">
            <label className="text-sm font-medium">Scan Receipt (Optional)</label>
            <SmartReceiptScanner
              onExtracted={handleReceiptExtracted}
              onReceiptUploaded={(url) => setReceiptUrl(url)}
              compact
            />
          </div>
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
