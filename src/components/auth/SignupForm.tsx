
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PasswordInput from "./PasswordInput";

interface SignupFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const SignupForm = ({ loading, setLoading, error, setError }: SignupFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email || !password) throw new Error("Please enter both email and password");

      if (password.trim() !== confirmPassword.trim()) {
        throw new Error("Passwords do not match");
      }

      // Use production domain for email redirect
      const redirectUrl = window.location.hostname === 'localhost' 
        ? `${window.location.origin}/onboarding`
        : `https://wheelsandwins.com/onboarding`;

      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      if (error) throw error;

      setError("Signup successful! Please check your email for verification, then you'll be redirected to complete your profile.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup}>
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

        <PasswordInput
          id="password"
          label="Password"
          placeholder="Create a secure password"
          value={password}
          onChange={setPassword}
          required
        />

        <PasswordInput
          id="confirm-password"
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />

        {error && (
          <Alert className={error.includes("successful") ? "bg-green-50 border-green-200" : "variant-destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Processing..." : "Create Account"}
        </Button>
      </div>
    </form>
  );
};

export default SignupForm;
