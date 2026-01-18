import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/AnimatedDialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProfileCompletionProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface ProfileData {
  vehicle_info: {
    type: string;
    make_model_year: string;
    fuel_type: string;
    fuel_efficiency: number;
  };
  travel_preferences: {
    style: string;
    camp_types: string[];
    drive_limit: string;
  };
  budget_preferences: {
    daily_budget: number;
    fuel_budget: number;
  };
  interests: string[];
  region: string;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [profileData, setProfileData] = useState<ProfileData>({
    vehicle_info: {
      type: '',
      make_model_year: '',
      fuel_type: '',
      fuel_efficiency: 8.5
    },
    travel_preferences: {
      style: '',
      camp_types: [],
      drive_limit: ''
    },
    budget_preferences: {
      daily_budget: 100,
      fuel_budget: 200
    },
    interests: [],
    region: 'Australia'
  });

  const handleInputChange = (section: keyof ProfileData | 'region', field: string, value: any) => {
    if (section === 'region') {
      setProfileData(prev => ({
        ...prev,
        region: value
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    }
  };

  const handleArrayChange = (section: keyof ProfileData, field: string, value: string, checked: boolean) => {
    setProfileData(prev => {
      if (section === 'interests') {
        const newArray = checked
          ? [...prev.interests, value]
          : prev.interests.filter(item => item !== value);
        
        return {
          ...prev,
          interests: newArray
        };
      } else {
        const sectionData = prev[section];
        if (typeof sectionData === 'object' && sectionData !== null && !Array.isArray(sectionData)) {
          const currentArray = (sectionData as any)[field] as string[];
          const newArray = checked
            ? [...currentArray, value]
            : currentArray.filter(item => item !== value);
          
          return {
            ...prev,
            [section]: {
              ...sectionData,
              [field]: newArray
            }
          };
        }
        return prev;
      }
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          vehicle_info: profileData.vehicle_info,
          travel_preferences: profileData.travel_preferences,
          budget_preferences: profileData.budget_preferences,
          interests: profileData.interests,
          region: profileData.region,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Profile Updated!",
        description: "Your profile has been successfully completed. PAM can now provide better personalized assistance.",
        variant: "default"
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-type">Vehicle Type</Label>
                <Select
                  value={profileData.vehicle_info.type}
                  onValueChange={(value) => handleInputChange('vehicle_info', 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caravan">Caravan</SelectItem>
                    <SelectItem value="motorhome">Motorhome</SelectItem>
                    <SelectItem value="camper_trailer">Camper Trailer</SelectItem>
                    <SelectItem value="fifth_wheeler">Fifth Wheeler</SelectItem>
                    <SelectItem value="pop_top">Pop Top</SelectItem>
                    <SelectItem value="tent">Tent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="make-model">Make, Model & Year</Label>
                <Input
                  id="make-model"
                  placeholder="e.g., Jayco Sterling 2020"
                  value={profileData.vehicle_info.make_model_year}
                  onChange={(e) => handleInputChange('vehicle_info', 'make_model_year', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuel-type">Fuel Type</Label>
                <Select
                  value={profileData.vehicle_info.fuel_type}
                  onValueChange={(value) => handleInputChange('vehicle_info', 'fuel_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="lpg">LPG</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuel-efficiency">Fuel Efficiency (L/100km)</Label>
                <Input
                  id="fuel-efficiency"
                  type="number"
                  step="0.1"
                  min="1"
                  max="50"
                  value={profileData.vehicle_info.fuel_efficiency}
                  onChange={(e) => handleInputChange('vehicle_info', 'fuel_efficiency', parseFloat(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Travel Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Travel Style</Label>
                <Select
                  value={profileData.travel_preferences.style}
                  onValueChange={(value) => handleInputChange('travel_preferences', 'style', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How do you like to travel?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget Conscious</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="comfort">Comfort Focused</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Camping Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'free_camps', label: 'Free Camps' },
                    { id: 'caravan_parks', label: 'Caravan Parks' },
                    { id: 'national_parks', label: 'National Parks' },
                    { id: 'farm_stays', label: 'Farm Stays' },
                    { id: 'powered_sites', label: 'Powered Sites' },
                    { id: 'unpowered_sites', label: 'Unpowered Sites' }
                  ].map(option => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={option.id}
                        checked={profileData.travel_preferences.camp_types.includes(option.id)}
                        onChange={(e) => handleArrayChange('travel_preferences', 'camp_types', option.id, e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor={option.id} className="text-sm">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Daily Driving Limit</Label>
                <Select
                  value={profileData.travel_preferences.drive_limit}
                  onValueChange={(value) => handleInputChange('travel_preferences', 'drive_limit', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How far do you like to drive per day?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="200km">Up to 200km</SelectItem>
                    <SelectItem value="400km">Up to 400km</SelectItem>
                    <SelectItem value="600km">Up to 600km</SelectItem>
                    <SelectItem value="800km">Up to 800km</SelectItem>
                    <SelectItem value="unlimited">No limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Budget Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="daily-budget">Daily Budget (AUD)</Label>
                <Input
                  id="daily-budget"
                  type="number"
                  min="0"
                  step="10"
                  value={profileData.budget_preferences.daily_budget}
                  onChange={(e) => handleInputChange('budget_preferences', 'daily_budget', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  This includes accommodation, food, and activities
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuel-budget">Weekly Fuel Budget (AUD)</Label>
                <Input
                  id="fuel-budget"
                  type="number"
                  min="0"
                  step="10"
                  value={profileData.budget_preferences.fuel_budget}
                  onChange={(e) => handleInputChange('budget_preferences', 'fuel_budget', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Estimated weekly fuel expenses
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Interests & Region</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Interests</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Fishing', 'Photography', 'Hiking', 'Beach',
                    'History', 'Wildlife', 'Adventure', 'Relaxation',
                    'Food & Wine', 'Cultural Sites', 'National Parks', 'Markets'
                  ].map(interest => (
                    <div key={interest} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={interest}
                        checked={profileData.interests.includes(interest)}
                        onChange={(e) => handleArrayChange('interests', '', interest, e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor={interest} className="text-sm">{interest}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Primary Region</Label>
                <Select
                  value={profileData.region}
                  onValueChange={(value) => handleInputChange('region', '', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary travel region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="Queensland">Queensland</SelectItem>
                    <SelectItem value="New South Wales">New South Wales</SelectItem>
                    <SelectItem value="Victoria">Victoria</SelectItem>
                    <SelectItem value="South Australia">South Australia</SelectItem>
                    <SelectItem value="Western Australia">Western Australia</SelectItem>
                    <SelectItem value="Tasmania">Tasmania</SelectItem>
                    <SelectItem value="Northern Territory">Northern Territory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Help PAM provide personalized recommendations by completing your profile.
            Step {currentStep} of {totalSteps}
          </p>
        </DialogHeader>

        {/* Progress bar */}
        <div className="w-full bg-secondary rounded-full h-2 mb-6">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {renderStep()}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isLoading}
          >
            Previous
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={nextStep} disabled={isLoading}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Profile
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};