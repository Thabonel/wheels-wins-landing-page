import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle } from "lucide-react";

const CancelTrial = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const cancelSubscription = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setError("Invalid cancellation link");
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("cancellation_token", token)
          .eq("subscription_cancelled", false)
          .single();

        if (fetchError || !profile) {
          throw new Error("Invalid or expired cancellation link");
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_cancelled: true,
            subscription_status: "cancelled",
            subscription_end_date: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (updateError) throw updateError;

        await supabase.auth.signOut();

        setSuccess(true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cancelSubscription();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container max-w-md mx-auto px-4 py-16">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">Processing cancellation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {success ? "Subscription Cancelled" : "Cancellation Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your subscription has been cancelled successfully. You will not be charged.
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-2">
                <p className="text-gray-600">
                  Your account will remain active until {new Date().toLocaleDateString()}.
                </p>
                <p className="text-gray-600">
                  We're sorry to see you go! If you change your mind, you can always sign up again.
                </p>
              </div>
            </>
          ) : (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  If you continue to have issues, please contact our support team.
                </p>
                <Button onClick={() => navigate("/")} variant="outline">
                  Return to Home
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CancelTrial;
