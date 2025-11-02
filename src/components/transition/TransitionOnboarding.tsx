import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TransitionType, TransitionProfile } from '@/types/transition.types';

interface TransitionOnboardingProps {
  onComplete: (data: OnboardingData) => Promise<void>;
  onSkip?: () => void;
  initialDepartureDate?: Date;
  existingProfile?: TransitionProfile | null;
  onSaveStep?: (data: Partial<OnboardingData>) => Promise<void>;
}

export interface OnboardingData {
  departure_date: Date;
  transition_type: TransitionType;
  motivation?: string;
  concerns?: string[];
}

const TRANSITION_TYPES: { value: TransitionType; label: string; description: string }[] = [
  {
    value: 'full_time',
    label: 'Full-Time RV Living',
    description: 'Living in an RV as your primary residence year-round'
  },
  {
    value: 'part_time',
    label: 'Part-Time RV Travel',
    description: 'Extended trips while maintaining a home base'
  },
  {
    value: 'seasonal',
    label: 'Seasonal Nomad',
    description: 'Traveling during specific seasons (snowbird, summer traveler, etc.)'
  },
  {
    value: 'exploring',
    label: 'Just Exploring',
    description: 'Still figuring out what works best for you'
  }
];

/**
 * TransitionOnboarding - Multi-step wizard to collect essential transition information
 * Shows when user first activates Life Transition Navigator
 */
export function TransitionOnboarding({
  onComplete,
  onSkip,
  initialDepartureDate,
  existingProfile,
  onSaveStep
}: TransitionOnboardingProps) {
  // Determine starting step: if Step 1 data exists, start at Step 2
  const hasStep1Data = existingProfile?.departure_date && existingProfile?.transition_type;
  const [step, setStep] = useState(hasStep1Data ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - Pre-populate from existing profile if available
  const [departureDate, setDepartureDate] = useState<Date | undefined>(
    existingProfile?.departure_date
      ? new Date(existingProfile.departure_date)
      : initialDepartureDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
  );
  const [transitionType, setTransitionType] = useState<TransitionType | undefined>(
    existingProfile?.transition_type || undefined
  );
  const [motivation, setMotivation] = useState(existingProfile?.motivation || '');
  const [concernsText, setConcernsText] = useState(
    existingProfile?.concerns?.join('\n') || ''
  );

  // Pre-populate form when existingProfile changes OR on initial render
  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.departure_date) {
        const date = new Date(existingProfile.departure_date);
        setDepartureDate(date);
      }
      if (existingProfile.transition_type) {
        setTransitionType(existingProfile.transition_type);
      }
      if (existingProfile.motivation) {
        setMotivation(existingProfile.motivation);
      }
      if (existingProfile.concerns && existingProfile.concerns.length > 0) {
        setConcernsText(existingProfile.concerns.join('\n'));
      }

      // If Step 1 data exists, ensure we're on Step 2
      if (existingProfile.departure_date && existingProfile.transition_type) {
        setStep(2);
      }
    }
  }, [existingProfile]);

  // Save step 1 data before proceeding to step 2
  const handleNextStep = async () => {
    if (!departureDate || !transitionType) return;

    setIsSubmitting(true);
    try {
      // Save step 1 data incrementally
      if (onSaveStep) {
        await onSaveStep({
          departure_date: departureDate,
          transition_type: transitionType,
        });
        toast.success('Progress saved!');
      }
      setStep(2);
    } catch (error) {
      console.error('Error saving step 1:', error);
      toast.error('Failed to save progress. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!departureDate || !transitionType) return;

    // Require at least one field in Step 2 (motivation or concerns)
    const hasConcerns = concernsText.trim().length > 0;
    const hasMotivation = motivation.trim().length > 0;

    if (!hasMotivation && !hasConcerns) {
      // At least one field must be filled in Step 2
      return;
    }

    setIsSubmitting(true);
    try {
      const concerns = concernsText
        .split('\n')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      await onComplete({
        departure_date: departureDate,
        transition_type: transitionType,
        motivation: motivation.trim() || undefined,
        concerns: concerns.length > 0 ? concerns : undefined
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsSubmitting(false);
    }
  };

  const canProceedFromStep1 = !!departureDate && !!transitionType;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Life Transition Navigator</CardTitle>
          <CardDescription>
            Let's set up your transition plan with a few quick questions. You can always change these later in Settings.
          </CardDescription>
          <div className="flex gap-2 mt-4">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors',
                  s === step ? 'bg-blue-600' : s < step ? 'bg-blue-300' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              {/* Step 1: Date and Type */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="departure-date">When are you planning to start?</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="departure-date"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !departureDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {departureDate ? format(departureDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={departureDate}
                        onSelect={setDepartureDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-gray-600">
                    Don't worry if you're not sure yet - you can adjust this anytime
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>What type of transition are you planning?</Label>
                  <RadioGroup
                    value={transitionType}
                    onValueChange={(value) => setTransitionType(value as TransitionType)}
                  >
                    {TRANSITION_TYPES.map((type) => (
                      <div
                        key={type.value}
                        className={cn(
                          'flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer transition-colors',
                          transitionType === type.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                        onClick={() => setTransitionType(type.value)}
                      >
                        <RadioGroupItem value={type.value} id={type.value} />
                        <div className="space-y-1 leading-none">
                          <Label
                            htmlFor={type.value}
                            className="font-semibold cursor-pointer"
                          >
                            {type.label}
                          </Label>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={onSkip} disabled={isSubmitting}>
                  Skip for now
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={!canProceedFromStep1 || isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Step 2: Motivation and Concerns */}
              <div className="space-y-6">
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                  Please fill in at least one of the fields below to help PAM understand your journey better.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="motivation">What's motivating this transition?</Label>
                  <Textarea
                    id="motivation"
                    placeholder="e.g., Seeking freedom, downsizing, adventure, early retirement, etc."
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    rows={3}
                  />
                  <p className="text-sm text-gray-600">
                    This helps PAM provide more personalized guidance
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concerns">Any concerns or questions?</Label>
                  <Textarea
                    id="concerns"
                    placeholder="One concern per line, e.g.:&#10;Finding reliable internet&#10;Managing healthcare on the road&#10;Dealing with mail forwarding"
                    value={concernsText}
                    onChange={(e) => setConcernsText(e.target.value)}
                    rows={4}
                  />
                  <p className="text-sm text-gray-600">
                    We'll help address these as you plan your transition
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!motivation.trim() && !concernsText.trim())}
                >
                  {isSubmitting ? 'Saving...' : 'Complete Setup'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
