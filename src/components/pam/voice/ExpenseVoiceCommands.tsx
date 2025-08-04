import { useEffect, useRef, useState } from 'react';
import { useExpenseActions } from '@/hooks/useExpenseActions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface VoiceCommandConfig {
  enabled: boolean;
  onExpenseCreated?: (expense: any) => void;
  debug?: boolean;
}

export function useExpenseVoiceCommands(config: VoiceCommandConfig) {
  const { addExpense, categories } = useExpenseActions();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Parse natural language expense commands
  const parseExpenseCommand = (command: string): {
    amount?: number;
    category?: string;
    description?: string;
    isValid: boolean;
  } => {
    const lowerCommand = command.toLowerCase();
    const result: any = { isValid: false };

    // Pattern: "log [amount] [dollars/bucks] for [category/description]"
    // Examples: 
    // - "log 45 dollars for gas"
    // - "log twenty five for food at diner"
    // - "expense 32.50 fuel at shell station"
    
    // Extract amount
    const amountPatterns = [
      /(?:log|expense|spent?|add)\s+\$?(\d+(?:\.\d{2})?)\s*(?:dollars?|bucks?)?/i,
      /(?:log|expense|spent?|add)\s+(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)(?:\s*(?:and\s*)?(\w+))?\s*(?:dollars?|bucks?)?/i,
    ];
    
    for (const pattern of amountPatterns) {
      const match = command.match(pattern);
      if (match) {
        if (match[1] && !isNaN(parseFloat(match[1]))) {
          result.amount = parseFloat(match[1]);
        } else {
          // Convert word numbers to digits
          result.amount = convertWordToNumber(match[1], match[2]);
        }
        break;
      }
    }

    // Extract category and description
    const categoryPatterns = [
      /(?:for|on|at)\s+(\w+)(?:\s+(?:at|from)\s+(.+))?/i,
      /(?:category|type)\s+(?:is\s+)?(\w+)/i,
    ];

    for (const pattern of categoryPatterns) {
      const match = command.match(pattern);
      if (match) {
        const potentialCategory = match[1];
        // Check if it matches known categories
        const matchedCategory = categories.find(cat => 
          cat.toLowerCase() === potentialCategory.toLowerCase() ||
          cat.toLowerCase().includes(potentialCategory.toLowerCase())
        );
        
        if (matchedCategory) {
          result.category = matchedCategory;
          result.description = match[2] || `${matchedCategory} expense`;
        } else {
          // Use as description if not a known category
          result.category = guessCategory(command);
          result.description = match[0].replace(/^(for|on|at)\s+/i, '');
        }
        break;
      }
    }

    // Default description if none found
    if (!result.description && result.amount) {
      result.description = `Voice logged expense`;
    }

    // Validate
    result.isValid = !!(result.amount && result.category && result.description);
    
    return result;
  };

  // Convert word numbers to numeric values
  const convertWordToNumber = (tens?: string, ones?: string): number => {
    const wordToNum: Record<string, number> = {
      'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
      'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
      'hundred': 100, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
      'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    };
    
    let total = 0;
    if (tens) total += wordToNum[tens.toLowerCase()] || 0;
    if (ones) total += wordToNum[ones.toLowerCase()] || 0;
    return total;
  };

  // Guess category based on keywords
  const guessCategory = (command: string): string => {
    const lowerCommand = command.toLowerCase();
    const categoryKeywords: Record<string, string[]> = {
      'Fuel': ['gas', 'fuel', 'diesel', 'petrol', 'gasoline', 'shell', 'chevron', 'exxon'],
      'Food': ['food', 'meal', 'lunch', 'dinner', 'breakfast', 'restaurant', 'diner', 'eat'],
      'Lodging': ['hotel', 'motel', 'camp', 'rv park', 'stay', 'night'],
      'Maintenance': ['repair', 'fix', 'oil', 'tire', 'mechanic', 'service'],
      'Entertainment': ['fun', 'movie', 'park', 'museum', 'ticket'],
      'Toll': ['toll', 'bridge', 'turnpike'],
      'Parking': ['parking', 'park'],
      'Grocery': ['grocery', 'groceries', 'walmart', 'store'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerCommand.includes(keyword))) {
        return category;
      }
    }

    return 'Other'; // Default category
  };

  // Initialize speech recognition
  useEffect(() => {
    if (!config.enabled) return;

    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || 
                            (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Voice commands not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive"
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      setTranscript(transcript);

      if (event.results[last].isFinal) {
        if (config.debug) {
          console.log('Voice command:', transcript);
        }
        processVoiceCommand(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        // Restart recognition if no speech detected
        setTimeout(() => {
          if (config.enabled && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still enabled
      if (config.enabled) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;

    // Start listening
    try {
      recognition.start();
      setIsListening(true);
      toast({
        title: "Voice commands active",
        description: "Say 'log [amount] dollars for [category]'",
        duration: 3000
      });
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [config.enabled]);

  // Process recognized voice command
  const processVoiceCommand = async (command: string) => {
    const parsed = parseExpenseCommand(command);
    
    if (!parsed.isValid) {
      if (config.debug) {
        console.log('Invalid expense command:', command);
      }
      return;
    }

    // Create expense
    const expense = {
      amount: parsed.amount!,
      category: parsed.category!,
      description: parsed.description!,
      date: format(new Date(), 'yyyy-MM-dd'),
    };

    const success = await addExpense(expense);
    
    if (success) {
      toast({
        title: "Expense logged!",
        description: `$${expense.amount} for ${expense.category}`,
        duration: 2000
      });
      
      // Speak confirmation
      speakConfirmation(`Logged ${expense.amount} dollars for ${expense.category}`);
      
      if (config.onExpenseCreated) {
        config.onExpenseCreated(expense);
      }
    } else {
      toast({
        title: "Failed to log expense",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Text-to-speech confirmation
  const speakConfirmation = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return {
    isListening,
    transcript,
    parseExpenseCommand, // Exposed for testing
  };
}