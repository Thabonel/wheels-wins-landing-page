
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";

interface SignupFormProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

/**
 * Validate password strength according to backend requirements
 */
const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Password must contain at least one special character (@$!%*?&)");
  }

  // Check for common patterns
  const commonPatterns = [
    'password', 'Password', 'PASSWORD',
    '12345678', '87654321',
    'qwerty', 'QWERTY',
    'abc123', 'ABC123',
  ];

  const passwordLower = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (passwordLower.includes(pattern.toLowerCase())) {
      errors.push("Password contains common patterns and is too weak");
      break;
    }
  }

  return { valid: errors.length === 0, errors };
};

const SignupForm = ({ loading, setLoading, error, setError }: SignupFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password match
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      setError("Password does not meet requirements:\n" + passwordValidation.errors.join("\n"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Set redirect URL to handle the plan selection flow
      const redirectUrl = `${window.location.origin}/you`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      // Note: The useSubscriptionFlow hook will handle showing the confirmation dialog
      // after the user is authenticated
    } catch (err: any) {
      if (err.message.includes("User already registered")) {
        setError("An account with this email already exists. Please log in instead.");
      } else if (err.message.includes("Password")) {
        // Backend password validation error
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a strong password"
          required
          disabled={loading}
          minLength={8}
          maxLength={128}
        />
        {password && (
          <PasswordStrengthIndicator password={password} className="mt-3" />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          disabled={loading}
          minLength={8}
          maxLength={128}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
};

export default SignupForm;
