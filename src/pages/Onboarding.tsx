
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRegion } from '@/context/RegionContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const WEBHOOK_URL = 'https://treflip2025.app.n8n.cloud/webhook/79d30fcb-ac7a-4a1d-9a53-9532bde02e52';

const Onboarding: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { region } = useRegion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    ask_full_name: '',
    ask_nickname: '',
    ask_email: user?.email || '',
    ask_region: region || '',
    ask_travel_style: '',
    ask_vehicle_type: '',
    ask_vehicle_make_model_year: '',
    ask_fuel_type: '',
    ask_towing: '',
    ask_second_vehicle: '',
    ask_drive_limit: '',
    ask_camp_types: '',
    ask_accessibility: '',
    ask_pets: '',
  });

  // Update form data when user or region changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ask_email: user?.email || '',
      ask_region: region || '',
    }));
  }, [user, region]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.warn('User not authenticated, redirecting to signup page');
      window.location.href = '/signup';
    }
  }, [isAuthenticated]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to complete onboarding",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        user_id: user.id,
        email: user.email,
        region: formData.ask_region || region,
        ...formData,
      };

      console.log('🚀 Submitting onboarding data to Pam webhook:', payload);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Your onboarding information has been submitted successfully.",
        });
        
        // Reset form
        setFormData({
          ask_full_name: '',
          ask_nickname: '',
          ask_email: user?.email || '',
          ask_region: region || '',
          ask_travel_style: '',
          ask_vehicle_type: '',
          ask_vehicle_make_model_year: '',
          ask_fuel_type: '',
          ask_towing: '',
          ask_second_vehicle: '',
          ask_drive_limit: '',
          ask_camp_types: '',
          ask_accessibility: '',
          ask_pets: '',
        });

        // Redirect to /you after successful submission
        setTimeout(() => {
          window.location.href = '/you';
        }, 2000);
      } else {
        const errorText = await response.text();
        console.error('❌ Webhook submission failed:', response.statusText, errorText);
        toast({
          title: "Submission Failed",
          description: `Failed to submit: ${response.statusText}`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Network error during submission:', error);
      toast({
        title: "Network Error",
        description: `Submission failed: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Please log in to complete your onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Help Pam Help You!</h1>
        <p className="text-muted-foreground mb-2">The more Pam knows, the better she can help you.</p>
        <p className="text-muted-foreground mb-4">
          Fill out as much or as little as you like — but here's what you'll get if you do:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="border-green-200">
            <CardContent className="p-4">
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  Save time planning fuel stops and routes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  Get tips for free and paid camps that fit your style
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  Track fuel efficiency for <em>your</em> actual vehicle
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✅</span>
                  Get alerts for discounts, pet-friendly stays, or accessibility support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✅</span>
                  Automatically log expenses, towing, or gear needs
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✅</span>
                  Personalized travel recommendations from Pam
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tell Pam About Yourself</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ask_full_name">What's your full name?</Label>
                <Input
                  type="text"
                  id="ask_full_name"
                  name="ask_full_name"
                  value={formData.ask_full_name}
                  onChange={handleChange}
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ask_nickname">What nickname would you like to use socially?</Label>
                <Input
                  type="text"
                  id="ask_nickname"
                  name="ask_nickname"
                  value={formData.ask_nickname}
                  onChange={handleChange}
                  placeholder="GreyNomadJohn"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ask_email">What's your best email address?</Label>
                <Input
                  type="email"
                  id="ask_email"
                  name="ask_email"
                  value={formData.ask_email}
                  onChange={handleChange}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ask_region">Which region are you travelling in?</Label>
                <Select
                  value={formData.ask_region}
                  onValueChange={(value) => handleSelectChange('ask_region', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="New Zealand">New Zealand</SelectItem>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="Rest of the World">Rest of the World</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ask_travel_style">Are you travelling solo or as a couple?</Label>
                <Select
                  value={formData.ask_travel_style}
                  onValueChange={(value) => handleSelectChange('ask_travel_style', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select travel style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solo">Solo</SelectItem>
                    <SelectItem value="Couple">Couple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vehicle Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ask_vehicle_type">What type of vehicle do you use?</Label>
                  <Input
                    type="text"
                    id="ask_vehicle_type"
                    name="ask_vehicle_type"
                    value={formData.ask_vehicle_type}
                    onChange={handleChange}
                    placeholder="e.g. RV, 4WD, Caravan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ask_vehicle_make_model_year">Make, model and year?</Label>
                  <Input
                    type="text"
                    id="ask_vehicle_make_model_year"
                    name="ask_vehicle_make_model_year"
                    value={formData.ask_vehicle_make_model_year}
                    onChange={handleChange}
                    placeholder="Toyota LandCruiser 2022"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ask_fuel_type">What fuel type does your vehicle use?</Label>
                  <Select
                    value={formData.ask_fuel_type}
                    onValueChange={(value) => handleSelectChange('ask_fuel_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Petrol">Petrol</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ask_drive_limit">Max comfortable daily driving distance?</Label>
                  <Input
                    type="text"
                    id="ask_drive_limit"
                    name="ask_drive_limit"
                    value={formData.ask_drive_limit}
                    onChange={handleChange}
                    placeholder="e.g. 300km or 200 miles"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ask_towing">Are you towing anything?</Label>
                  <Input
                    type="text"
                    id="ask_towing"
                    name="ask_towing"
                    value={formData.ask_towing}
                    onChange={handleChange}
                    placeholder="Type, weight, make/model"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ask_second_vehicle">Do you travel with a second vehicle?</Label>
                  <Input
                    type="text"
                    id="ask_second_vehicle"
                    name="ask_second_vehicle"
                    value={formData.ask_second_vehicle}
                    onChange={handleChange}
                    placeholder="e.g. Suzuki Jimny, 1.2T"
                  />
                </div>
              </div>
            </div>

            {/* Travel Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Travel Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ask_camp_types">Preferred camp types?</Label>
                  <Input
                    type="text"
                    id="ask_camp_types"
                    name="ask_camp_types"
                    value={formData.ask_camp_types}
                    onChange={handleChange}
                    placeholder="Free, Paid, Bush, RV Park..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ask_pets">Do you travel with pets?</Label>
                  <Input
                    type="text"
                    id="ask_pets"
                    name="ask_pets"
                    value={formData.ask_pets}
                    onChange={handleChange}
                    placeholder="e.g. 2 dogs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ask_accessibility">Any accessibility or mobility needs?</Label>
                <Textarea
                  id="ask_accessibility"
                  name="ask_accessibility"
                  value={formData.ask_accessibility}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Optional - let us know how we can better assist you"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? 'Submitting to Pam...' : 'Submit Onboarding Information'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
