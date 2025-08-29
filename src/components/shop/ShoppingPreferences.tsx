
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useShoppingProfile } from "@/hooks/useShoppingProfile";
import { usePersonalizedRecommendations } from "@/hooks/usePersonalizedRecommendations";
import { Settings, Sparkles } from "lucide-react";

type TravelStyle = 'budget' | 'mid-range' | 'luxury' | 'adventure' | 'business' | 'leisure';

const TRAVEL_STYLES: Array<{ value: TravelStyle; label: string; description: string }> = [
  { value: 'budget', label: 'Budget Conscious', description: 'Looking for the best deals and value' },
  { value: 'mid-range', label: 'Mid-Range', description: 'Balance of quality and affordability' },
  { value: 'luxury', label: 'Luxury', description: 'Premium products and experiences' },
  { value: 'adventure', label: 'Adventure', description: 'Outdoor and rugged travel gear' },
  { value: 'business', label: 'Business', description: 'Professional and efficient solutions' },
  { value: 'leisure', label: 'Leisure', description: 'Comfort and relaxation focused' }
];

const PRODUCT_CATEGORIES = [
  'Electronics', 'Outdoor Gear', 'Comfort Items', 'Health & Safety', 
  'Entertainment', 'Practical Tools', 'Kitchen & Dining', 'Navigation',
  'Power & Energy', 'Storage Solutions'
];

export default function ShoppingPreferences() {
  const { profile, createOrUpdateProfile, isLoading } = useShoppingProfile();
  const { generateRecommendations } = usePersonalizedRecommendations();
  const [selectedStyle, setSelectedStyle] = useState<TravelStyle>(profile?.travelStyle || 'budget');
  const [priceSensitivity, setPriceSensitivity] = useState([profile?.priceSensitivity || 0.5]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile?.preferredCategories || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await createOrUpdateProfile({
        travelStyle: selectedStyle,
        priceSensitivity: priceSensitivity[0],
        preferredCategories: selectedCategories
      });
      
      // Regenerate recommendations with new preferences
      await generateRecommendations();
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Shopping Preferences
          </CardTitle>
          <p className="text-sm text-gray-600">
            Help Pam understand your travel style and preferences for better recommendations
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Travel Style Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Travel Style</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {TRAVEL_STYLES.map((style) => (
                <Card 
                  key={style.value}
                  className={`cursor-pointer transition-colors ${
                    selectedStyle === style.value 
                      ? 'ring-2 ring-purple-500 bg-purple-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedStyle(style.value)}
                >
                  <CardContent className="p-4">
                    <h4 className="font-medium">{style.label}</h4>
                    <p className="text-sm text-gray-600 mt-1">{style.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Price Sensitivity */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Price Sensitivity</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Budget Focused</span>
                <span>Premium Focused</span>
              </div>
              <Slider
                value={priceSensitivity}
                onValueChange={setPriceSensitivity}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
              <p className="text-sm text-gray-500 text-center">
                Current: {priceSensitivity[0] < 0.3 ? 'Very Budget Conscious' : 
                          priceSensitivity[0] < 0.7 ? 'Balanced' : 'Premium Focused'}
              </p>
            </div>
          </div>

          {/* Preferred Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Interested Categories</h3>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Changes will improve your personalized recommendations
            </p>
            <Button 
              onClick={handleSavePreferences}
              disabled={isSaving || isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
