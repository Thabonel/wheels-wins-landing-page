import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTransitionModule } from "@/hooks/useTransitionModule";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

/**
 * TransitionNavigatorCard - Prominent call-to-action for Life Transition Planning
 * Shows on You page to encourage users to start planning their RV transition
 */
export const TransitionNavigatorCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, shouldShowInNav, daysUntilDeparture } = useTransitionModule();
  const [isCreating, setIsCreating] = useState(false);

  // If already active and showing in nav, show quick stats instead of CTA
  if (shouldShowInNav && profile) {
    return (
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Life Transition Progress</CardTitle>
            </div>
            <Button
              onClick={() => navigate("/transition")}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            >
              Open Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">
                {daysUntilDeparture !== null && daysUntilDeparture > 0 ? (
                  <span className="font-semibold text-blue-600">
                    {daysUntilDeparture} days until departure
                  </span>
                ) : daysUntilDeparture === 0 ? (
                  <span className="font-semibold text-green-600">Departure day!</span>
                ) : (
                  <span className="font-semibold text-gray-600">Planning in progress</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Phase: {profile.current_phase || 'Planning'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show CTA to start planning
  const handleStartPlanning = async () => {
    if (!user) {
      toast.error("Please log in to start planning");
      return;
    }

    setIsCreating(true);

    try {
      // Use upsert to create or enable profile in single operation
      // Only set minimal required fields - users can customize everything later
      const defaultDeparture = new Date();
      defaultDeparture.setDate(defaultDeparture.getDate() + 90);

      const payload = {
        user_id: user.id,
        is_enabled: true,
        // Optional sensible defaults (can be changed anytime in Settings)
        departure_date: defaultDeparture.toISOString().slice(0, 10),
        current_phase: 'planning',
        transition_type: 'full_time',
      };

      const { data: upserted, error: upsertErr } = await supabase
        .from('transition_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (upsertErr) {
        console.error('Failed to set up transition profile:', upsertErr);
        toast.error('Failed to set up your transition profile');
        setIsCreating(false);
        return;
      }

      toast.success("Let's start planning your transition!");
      navigate('/transition');
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 via-blue-50 to-transparent">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-purple-600" />
              <CardTitle className="text-xl">Ready for Your Next Chapter?</CardTitle>
            </div>
            <CardDescription className="text-base">
              Plan your transition to full-time RV living with our comprehensive Life Transition Navigator
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Phase-by-Phase Checklist</p>
                <p className="text-gray-600">Track every step from planning to establishment</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Budget Planning</p>
                <p className="text-gray-600">Financial tools for a smooth transition</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Timeline Tracking</p>
                <p className="text-gray-600">Stay on schedule with countdown timers</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleStartPlanning}
              disabled={isCreating}
              size="lg"
              className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isCreating ? "Setting up..." : "Start Planning My Transition"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
