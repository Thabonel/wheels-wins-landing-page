
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Phone, MapPin, Heart, Wifi, AlertTriangle, Users, Compass } from 'lucide-react';
import { PersonalizedSafetyCard } from '@/components/safety/PersonalizedSafetyCard';
import { useProfile } from '@/hooks/useProfile';
import { PageHelp } from '@/components/common/PageHelp';

const Safety = () => {
  const { profile } = useProfile();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Shield className="h-10 w-10 text-blue-600" />
          RV Travel Safety Resources
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Knowledge, preparation, and community support for confident RV adventures
        </p>
      </div>

      {/* Personalized Content (Opt-In) */}
      {profile?.content_preferences?.show_personalized_safety && (
        <PersonalizedSafetyCard />
      )}

      {/* Universal Safety Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Situational Awareness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-blue-600" />
              Situational Awareness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              Building confidence starts with awareness of your surroundings.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Trust your instincts - if something feels off, it probably is</li>
              <li>• Arrive at campgrounds during daylight when possible</li>
              <li>• Note exit routes and emergency services locations</li>
              <li>• Keep curtains/blinds closed at night for privacy</li>
              <li>• Share your location with a trusted contact</li>
            </ul>
          </CardContent>
        </Card>

        {/* Emergency Communication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Emergency Communication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              Stay connected even in remote areas with the right tools.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>911</strong> - Emergency services (works on any phone)</li>
              <li>• <strong>Satellite messenger</strong> - Garmin inReach, SPOT (for off-grid)</li>
              <li>• <strong>Cell signal booster</strong> - weBoost, HiBoost</li>
              <li>• <strong>Offline maps</strong> - Download Google Maps areas before travel</li>
              <li>• <strong>Emergency contact card</strong> - Keep in wallet/glove box</li>
            </ul>
          </CardContent>
        </Card>

        {/* RV & Campground Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Campground Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              Choosing and securing your camping location wisely.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Research campgrounds on Campendium, RV Parky before arrival</li>
              <li>• Choose well-lit sites near campground office or hosts</li>
              <li>• Lock RV doors and compartments, even during the day</li>
              <li>• Use wheel locks/hitch locks when parked long-term</li>
              <li>• Install motion-sensor lights outside RV</li>
              <li>• Know your neighbors - friendly check-ins build community</li>
            </ul>
          </CardContent>
        </Card>

        {/* Weather & Environmental */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              Weather & Environmental Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              Preparing for Mother Nature's challenges on the road.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Check weather forecasts daily (NOAA Weather Radio)</li>
              <li>• Secure awnings, outdoor items before storms</li>
              <li>• Know tornado/severe weather shelter locations</li>
              <li>• Wildfire season: Monitor air quality, have evacuation route</li>
              <li>• Flash flood awareness in desert/canyon areas</li>
              <li>• Wildlife safety: Store food properly, know local risks</li>
            </ul>
          </CardContent>
        </Card>

        {/* Medical Preparedness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-blue-600" />
              Medical Preparedness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              Being prepared for health situations on the road.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Carry comprehensive first aid kit (Adventure Medical Kits)</li>
              <li>• Know nearest urgent care/hospital at each stop</li>
              <li>• Keep medications in climate-controlled area</li>
              <li>• Carry copies of prescriptions and medical records</li>
              <li>• Health insurance: Verify coverage in travel states</li>
              <li>• <strong>Poison Control:</strong> 1-800-222-1222</li>
            </ul>
          </CardContent>
        </Card>

        {/* Technology & Security Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-blue-600" />
              Technology & Security Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              Modern tools to enhance your safety on the road.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>Location sharing apps:</strong> Life360, Find My Friends</li>
              <li>• <strong>RV security cameras:</strong> Arlo, Ring (solar powered)</li>
              <li>• <strong>Door/window sensors:</strong> SimpliSafe portable systems</li>
              <li>• <strong>Personal safety apps:</strong> Noonlight, bSafe</li>
              <li>• <strong>Pepper spray/air horn</strong> - easily accessible</li>
              <li>• <strong>Flashlights/headlamps</strong> - one in every room</li>
            </ul>
          </CardContent>
        </Card>

        {/* Community Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Community & Support Networks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700">
              You're never alone - the RV community has your back.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Join Facebook RV groups for your travel areas</li>
              <li>• Campground hosts: Experienced, helpful neighbors</li>
              <li>• RV buddy system: Team up with other travelers</li>
              <li>• Local RV clubs: FMCA, Escapees, Good Sam</li>
              <li>• Online forums: iRV2, RV.net for advice/support</li>
            </ul>
          </CardContent>
        </Card>

        {/* Emergency Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-red-600" />
              24/7 Emergency Hotlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-700 font-medium">
              Save these numbers in your phone now:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>911</strong> - Emergency services (police, fire, medical)</li>
              <li>• <strong>988</strong> - Suicide & Crisis Lifeline (call or text)</li>
              <li>• <strong>1-800-799-7233</strong> - National Domestic Violence Hotline</li>
              <li>• <strong>1-800-656-4673</strong> - RAINN Sexual Assault Hotline</li>
              <li>• <strong>1-800-222-1222</strong> - Poison Control</li>
              <li>• <strong>1-800-273-8255 (Press 1)</strong> - Veterans Crisis Line</li>
              <li>• <strong>Text HOME to 741741</strong> - Crisis Text Line</li>
            </ul>
          </CardContent>
        </Card>

      </div>

      {/* Statistical Reality Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Statistical Reality: RV Travel Safety
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700">
            <strong>Knowledge is power:</strong> Solo RV travel is statistically safer than living in most cities.
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Crime rates in campgrounds are exceptionally low</li>
            <li>• 85% of solo RV travelers are women (you're not alone!)</li>
            <li>• Average age: 47 years old - experienced travelers</li>
            <li>• Safety concerns decrease 24% after 10+ trips (78% to 59%)</li>
            <li>• Experience builds confidence - knowledge reduces anxiety</li>
          </ul>
          <p className="text-sm text-gray-700 italic mt-4">
            The RV community is one of the friendliest, most helpful groups you'll ever meet.
            Most campgrounds have hosts, regular visitors, and neighbors who look out for each other.
          </p>
        </CardContent>
      </Card>

      <PageHelp
        title="RV Travel Safety Help"
        description="This page provides comprehensive safety resources for RV travelers, including situational awareness, emergency communication, and community support."
        tips={[
          "Start with universal safety content that applies to all travelers",
          "Enable personalized content in Privacy Settings to see gender-specific resources",
          "Save emergency contacts in your phone now - don't wait for an emergency",
          "Statistical reality: Solo RV travel is safer than living in most cities",
          "Join community groups to build your safety network on the road"
        ]}
      />
    </div>
  );
};

export default Safety;
