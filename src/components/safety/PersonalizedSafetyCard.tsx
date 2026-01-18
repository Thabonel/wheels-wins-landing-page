
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Activity } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';

export const PersonalizedSafetyCard = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  if (!profile?.gender_identity) {
    return null;
  }

  const genderIdentity = profile.gender_identity;

  return (
    <>
      {genderIdentity === 'Woman' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Additional Resources for Women Solo Travelers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">You're Not Alone</h4>
              <p className="text-sm text-gray-700">
                85% of solo travelers are women, with an average age of 47. After 10+ trips,
                safety concerns drop from 78% to 59%. Experience builds confidence.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Statistical Reality</h4>
              <p className="text-sm text-gray-700">
                Solo RV travel is statistically safer than living in most cities. Crime
                rates in campgrounds are exceptionally low. Knowledge is power.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Women's Safety Network
              </h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• Connect with other women solo travelers in your area</li>
                <li>• Share campground recommendations and trusted locations</li>
                <li>• Optional buddy system for first-time solo trips</li>
                <li>• Women-led workshops on self-defense and confidence</li>
              </ul>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => navigate('/community')}
              >
                Join Women's Network
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">Practical Skills Workshops</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Verbal self-defense and boundary setting</li>
                <li>• Solo travel confidence building</li>
                <li>• RV maintenance for beginners</li>
                <li>• Emergency preparedness</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">24/7 Support Resources</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>National Domestic Violence Hotline:</strong> 1-800-799-7233</li>
                <li>• <strong>RAINN Sexual Assault Hotline:</strong> 1-800-656-4673</li>
                <li>• <strong>Crisis Text Line:</strong> Text HOME to 741741</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {genderIdentity === 'Man' && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>Additional Resources for Men Solo Travelers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Men's Mental Health Matters</h4>
              <p className="text-sm text-gray-700">
                Solo travel can be isolating. Men's friendships have dropped 51% since 1990.
                Building connections on the road supports mental health and well-being.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Mental Health Resources</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988</li>
                <li>• <strong>Veterans Crisis Line:</strong> 1-800-273-8255 (Press 1)</li>
                <li>• <strong>Men's Health Network:</strong> 202-543-6461</li>
                <li>• <strong>Crisis Text Line:</strong> Text HOME to 741741</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                Activity-Based Connection
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                Men's friendships form through shared activities. Connect with others
                who share your interests - no pressure to "talk about feelings."
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/community')}
              >
                Find Activity Groups
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">Veterans Support</h4>
              <p className="text-sm text-gray-700">
                Connect with fellow veterans on the road through Team RWB-style
                activity groups and camaraderie.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
