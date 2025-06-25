
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import OAuthButtons from "@/components/auth/OAuthButtons";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) navigate("/you");

  const handleLoginSuccess = () => {
    navigate("/you");
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true);
      setError(null);
      
      // Use production domain for OAuth redirect
      const redirectUrl = window.location.hostname === 'localhost'
        ? `${window.location.origin}/you`
        : `https://wheelsandwins.com/you`;
      
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
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Log in to access your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <LoginForm 
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            onSuccess={handleLoginSuccess}
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

          <OAuthButtons onOAuthSignup={handleOAuthLogin} loading={loading} />

          <div className="text-center text-sm">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
