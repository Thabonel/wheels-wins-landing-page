
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase";
import { useAuth } from "@/context/AuthContext";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // If user is already authenticated, redirect to You page
  if (isAuthenticated) {
    navigate("/you");
  }

  // Real-time validation for signup
  const validateSignupForm = () => {
    const errors: string[] = [];
    
    if (password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }
    
    if (password !== confirmPassword) {
      errors.push("Passwords do not match");
    }
    
    if (!email || !email.includes('@')) {
      errors.push("Please enter a valid email address");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Update validation when form fields change (only for signup)
  const handlePasswordChange = (value: string, isConfirm = false) => {
    if (isConfirm) {
      setConfirmPassword(value);
    } else {
      setPassword(value);
    }
    
    if (activeTab === "signup") {
      // Validate after a short delay to avoid too frequent updates
      setTimeout(validateSignupForm, 300);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (activeTab === "signup") {
      setTimeout(validateSignupForm, 300);
    }
  };

  const handleAuth = async (action: "login" | "signup") => {
    setError(null);
    setValidationErrors([]);
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error("Please enter both email and password");
      }

      // Additional validation for signup
      if (action === "signup") {
        if (!validateSignupForm()) {
          setLoading(false);
          return;
        }
      }

      if (action === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/you`
          }
        });

        if (error) throw error;
        
        // Show success message for signup
        setError("Signup successful! Please check your email for verification.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // On successful login, redirect to You page
        navigate("/you");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/you`
        }
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'password' | 'confirm') => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card className="w-full border-2 shadow-lg">
        <CardHeader className="space-y-1 text-center pb-6">
          <CardTitle className="text-3xl font-bold text-foreground">Welcome to Wheels & Wins</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {activeTab === "login" 
              ? "Log in to access your account" 
              : "Create an account to get started"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
              <TabsTrigger value="login" className="text-lg font-semibold">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-lg font-semibold">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAuth("login");
              }}>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="login-email" className="text-base font-medium">Email</Label>
                    <Input 
                      id="login-email"
                      type="email" 
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label htmlFor="login-password" className="text-base font-medium">Password</Label>
                      <button 
                        type="button"
                        className="text-sm text-primary hover:text-primary/80 font-medium"
                        onClick={(e) => {
                          e.preventDefault();
                          alert("Password reset functionality coming soon!");
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input 
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 text-base pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('password')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-base">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold" 
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Login"}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAuth("signup");
              }}>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="signup-email" className="text-base font-medium">Email</Label>
                    <Input 
                      id="signup-email"
                      type="email" 
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="signup-password" className="text-base font-medium">Password</Label>
                    <div className="relative">
                      <Input 
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className="h-12 text-base pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('password')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="confirm-password" className="text-base font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Input 
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => handlePasswordChange(e.target.value, true)}
                        className="h-12 text-base pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Real-time validation messages */}
                  {validationErrors.length > 0 && (
                    <div className="space-y-2">
                      {validationErrors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-base">{error}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {error && (
                    <Alert className={error.includes("successful") ? "bg-green-50 border-green-200" : "variant-destructive"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-base">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold" 
                    disabled={loading || validationErrors.length > 0}
                  >
                    {loading ? "Processing..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-6 pt-6">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-card px-3 text-muted-foreground font-medium">or continue with</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button 
              variant="outline" 
              className="h-12 text-base font-medium"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            <Button 
              variant="outline" 
              className="h-12 text-base font-medium"
              onClick={() => handleOAuthSignIn('facebook')}
              disabled={loading}
            >
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
