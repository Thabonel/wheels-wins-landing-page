import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TripTemplate } from '@/services/tripTemplateService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PAMTripAssistantProps {
  templates: TripTemplate[];
  onSelectTemplate: (template: TripTemplate) => void;
}

export default function PAMTripAssistant({ templates, onSelectTemplate }: PAMTripAssistantProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recommendations, setRecommendations] = useState<TripTemplate[]>([]);
  const [pamResponse, setPamResponse] = useState('');
  const [voiceSupported] = useState('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const handleVoiceInput = () => {
    if (!voiceSupported) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Voice Recognition Error",
        description: "Could not understand your speech. Please try again.",
        variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleAskPAM = async () => {
    if (!query.trim()) return;

    setIsProcessing(true);
    setPamResponse('');
    setRecommendations([]);

    // Simulate PAM processing and recommendations
    setTimeout(() => {
      // Analyze query for keywords
      const lowerQuery = query.toLowerCase();
      let filteredTemplates = [...templates];
      let responseText = '';

      // Filter based on query intent
      if (lowerQuery.includes('beach') || lowerQuery.includes('coast')) {
        filteredTemplates = templates.filter(t => 
          t.category === 'coastal' || 
          t.highlights.some(h => h.toLowerCase().includes('beach') || h.toLowerCase().includes('coast'))
        );
        responseText = "I found some beautiful coastal routes that match your interest in beach destinations!";
      } else if (lowerQuery.includes('mountain')) {
        filteredTemplates = templates.filter(t => 
          t.category === 'mountains' || 
          t.highlights.some(h => h.toLowerCase().includes('mountain'))
        );
        responseText = "Here are some scenic mountain adventures I think you'll love!";
      } else if (lowerQuery.includes('easy') || lowerQuery.includes('beginner')) {
        filteredTemplates = templates.filter(t => t.difficulty === 'beginner');
        responseText = "I've selected beginner-friendly routes that are perfect for a relaxed journey.";
      } else if (lowerQuery.includes('long') || lowerQuery.includes('month')) {
        filteredTemplates = templates.filter(t => t.estimatedDays >= 14).sort((a, b) => b.estimatedDays - a.estimatedDays);
        responseText = "These longer journeys will give you plenty of time to explore and relax!";
      } else if (lowerQuery.includes('budget') || lowerQuery.includes('cheap') || lowerQuery.includes('affordable')) {
        filteredTemplates = templates.sort((a, b) => a.suggestedBudget - b.suggestedBudget).slice(0, 5);
        responseText = "I've found the most budget-friendly options for your adventure!";
      } else {
        // Default recommendations based on popularity/rating
        filteredTemplates = templates.slice(0, 3);
        responseText = "Based on your preferences, here are my top recommendations for you!";
      }

      // Add personalization
      if (lowerQuery.includes('family')) {
        responseText += " These routes have plenty of family-friendly stops along the way.";
      } else if (lowerQuery.includes('solo')) {
        responseText += " Perfect for solo travelers seeking adventure and self-discovery.";
      }

      setPamResponse(responseText);
      setRecommendations(filteredTemplates.slice(0, 3));
      setIsProcessing(false);
    }, 1500);
  };

  const handleSelectRecommendation = (template: TripTemplate) => {
    onSelectTemplate(template);
    setIsOpen(false);
    toast({
      title: "Trip Added",
      description: `${template.name} has been added to your journey!`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Ask PAM
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            PAM Trip Assistant
          </DialogTitle>
          <DialogDescription>
            Tell me what kind of RV adventure you're looking for, and I'll recommend the perfect trips!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Query Input */}
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                placeholder="E.g., 'I want a relaxing beach trip for 2 weeks' or 'Show me mountain adventures under $2000'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[100px] pr-12"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskPAM();
                  }
                }}
              />
              {voiceSupported && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleVoiceInput}
                  className={cn(
                    "absolute right-2 top-2 h-8 w-8 p-0",
                    isListening && "text-red-600 animate-pulse"
                  )}
                  disabled={isProcessing}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
            </div>
            <Button 
              onClick={handleAskPAM} 
              disabled={!query.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  PAM is thinking...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Ask PAM
                </>
              )}
            </Button>
          </div>

          {/* PAM Response */}
          {pamResponse && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">PAM says:</p>
                <p className="text-sm text-blue-800">{pamResponse}</p>
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Recommended Trips:</h4>
              {recommendations.map((template) => (
                <Card 
                  key={template.id} 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectRecommendation(template)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium">{template.name}</h5>
                      <Badge variant="outline" className="text-xs">
                        {template.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{template.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{template.estimatedDays} days</span>
                      <span>•</span>
                      <span>{template.estimatedMiles.toLocaleString()} miles</span>
                      <span>•</span>
                      <span>${template.suggestedBudget.toLocaleString()}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Example Queries */}
          {!pamResponse && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">Try asking:</p>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">• "Show me easy coastal trips for beginners"</p>
                <p className="text-xs text-gray-600">• "I have $3000 and 3 weeks, what do you recommend?"</p>
                <p className="text-xs text-gray-600">• "Find mountain adventures with great scenery"</p>
                <p className="text-xs text-gray-600">• "What's good for a family with kids?"</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}