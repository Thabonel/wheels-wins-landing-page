
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PasswordInput from "./PasswordInput";

interface LoginFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  onSuccess: () => void;
}

const LoginForm = ({ loading, setLoading, error, setError, onSuccess }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email || !password) throw new Error("Please enter both email and password");

      await signIn(email, password);
      onSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Enhanced error detection for HTML responses
      let errorMessage = "Failed to login";
      
      if (err.message?.includes("<!doctype") || err.message?.includes("Unexpected token '<'")) {
        errorMessage = "Authentication service configuration error. The Supabase URL may be incorrect or malformed. Please check the browser console for debug information.";
        
        // Log additional debug info for staging
        if (window.location.hostname.includes('staging')) {
          console.error('🔴 Authentication Error Details:', {
            error: err.message,
            errorType: err.name,
            supabaseConfigured: !!(window as any).supabase,
            currentUrl: window.location.href,
            hint: 'Check Netlify environment variables for VITE_SUPABASE_URL - it may have spaces, newlines, or be incorrect'
          });
        }
      } else if (err.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (err.message?.includes("permission denied")) {
        errorMessage = "There was an authentication issue. Please try again or contact support.";
      } else if (err.message?.includes("Email not confirmed")) {
        errorMessage = "Please check your email and click the confirmation link before logging in.";
      } else if (err.message?.includes("NetworkError") || err.message?.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="email@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/reset-password"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            label=""
            placeholder=""
            value={password}
            onChange={setPassword}
            required
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Processing..." : "Login"}
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;
