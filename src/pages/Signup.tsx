
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import SignupForm from "@/components/auth/SignupForm";
import OAuthButtons from "@/components/auth/OAuthButtons";

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/you");
    }
  }, [isAuthenticated, navigate]);

  const handleOAuthSignup = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true);
      setError(null);
      
      // Use production domain for OAuth redirect
      const redirectUrl = window.location.hostname === 'localhost'
        ? `${window.location.origin}/onboarding`
        : `https://wheelsandwins.com/onboarding`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
          <CardDescription>
            Get started with Wheels & Wins today
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SignupForm 
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
          />
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <OAuthButtons onOAuthSignup={handleOAuthSignup} loading={loading} />

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;
