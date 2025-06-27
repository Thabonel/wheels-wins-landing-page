
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const LogoutButton = () => {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      
      // Navigate to homepage immediately after logout
      navigate("/");
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="text-sm px-4 py-2 rounded-md border border-gray-300 bg-white/80 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoggingOut ? "Logging Out..." : "Log Out"}
    </button>
  );
};

export default LogoutButton;
