
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface LoginButtonProps {
  isHomePage: boolean;
  isMobile?: boolean;
}

const LoginButton = ({ isHomePage, isMobile = false }: LoginButtonProps) => {
  const { login } = useAuth();

  const handleLogin = () => {
    login();
    toast.success("Successfully logged in");
  };

  return (
    <Button
      variant={isHomePage ? "outline" : "secondary"}
      className={`${isMobile ? "text-base font-semibold px-4 py-2" : "text-lg font-semibold px-6 py-5"} 
        flex items-center gap-${isMobile ? "1" : "2"} 
        ${isHomePage ? "bg-transparent border-white text-white hover:bg-white/20 drop-shadow-md" : ""}`}
      onClick={handleLogin}
    >
      <LogIn size={isMobile ? 16 : 20} />
      <span>Log In</span>
    </Button>
  );
};

export default LoginButton;
