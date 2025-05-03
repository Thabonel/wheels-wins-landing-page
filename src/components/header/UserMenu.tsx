
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  isHomePage: boolean;
  isMobile?: boolean;
}

const UserMenu = ({ isHomePage, isMobile = false }: UserMenuProps) => {
  const { user, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    login();
    toast.success("Successfully logged in");
  };

  const handleAvatarClick = () => {
    navigate("/profile");
  };

  return (
    <>
      {isAuthenticated ? (
        <Button 
          variant="ghost" 
          className="rounded-full p-0 w-10 h-10 overflow-hidden"
          aria-label="User profile"
          onClick={handleAvatarClick}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      ) : (
        <Button
          variant={isHomePage ? "outline" : "secondary"}
          className={`${isMobile ? "text-base px-4 py-2" : "text-lg px-6 py-2"} 
            font-semibold flex items-center gap-2
            ${isHomePage ? "bg-transparent border-white text-white hover:bg-white/20 drop-shadow-md" : ""}`}
          onClick={handleLogin}
        >
          <LogIn size={isMobile ? 16 : 20} />
          <span>Log In</span>
        </Button>
      )}
    </>
  );
};

export default UserMenu;
