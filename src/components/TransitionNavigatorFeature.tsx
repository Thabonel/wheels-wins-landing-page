import { Clock, CheckCircle, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const TransitionNavigatorFeature = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <CheckCircle className="w-8 h-8 text-green-600" />,
      title: "Step-by-Step Checklist",
      description: "From downsizing to departure day - never miss a critical task"
    },
    {
      icon: <Calendar className="w-8 h-8 text-blue-600" />,
      title: "Smart Timeline",
      description: "Know exactly what to do and when, customized to your departure date"
    },
    {
      icon: <Clock className="w-8 h-8 text-purple-600" />,
      title: "Auto-Hides When Done",
      description: "Once you hit the road, the planner gracefully gets out of your way"
    },
  ];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/transition');
    } else {
      navigate('/signup');
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Clock className="w-4 h-4" />
            New Feature: Life Transition Navigator
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Planning to Hit the Road?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We know the transition from traditional life to full-time RV living can feel overwhelming.
            That's why we built a complete planning system to guide you every step of the way.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <CardContent className="pt-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-white rounded-full shadow-md">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-6 text-center">What's Included in the Transition Navigator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Vehicle Modifications Tracker</h4>
                <p className="text-sm text-gray-600">Plan upgrades, track costs, manage your build</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Equipment List Manager</h4>
                <p className="text-sm text-gray-600">Never forget essential gear - organized by priority</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Digital Life Consolidation</h4>
                <p className="text-sm text-gray-600">Cancel services, go paperless, simplify your life</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Shakedown Trip Logger</h4>
                <p className="text-sm text-gray-600">Test everything before you go all-in</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Psychological Support Tools</h4>
                <p className="text-sm text-gray-600">Navigate the emotional side of major life change</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-1">Launch Week Countdown</h4>
                <p className="text-sm text-gray-600">Final week checklist - nothing gets forgotten</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isAuthenticated ? 'Open Transition Navigator' : 'Get Started Free'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              {isAuthenticated
                ? 'Enable in your settings to see the countdown in your navigation'
                : 'No credit card required - start planning your adventure today'
              }
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransitionNavigatorFeature;
