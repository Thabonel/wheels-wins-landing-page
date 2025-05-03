
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface LogoutButtonProps {
  isHomePage: boolean;
}

const LogoutButton = ({ isHomePage }: LogoutButtonProps) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.info("You have been logged out");
  };

  return (
    <Button
      variant="outline"
      className={`font-semibold flex items-center gap-2 ${
        isHomePage ? "bg-transparent border-white text-white hover:bg-white/20" : ""
      }`}
      onClick={handleLogout}
    >
      <LogOut size={18} />
      <span>Log Out</span>
    </Button>
  );
};

export default LogoutButton;
