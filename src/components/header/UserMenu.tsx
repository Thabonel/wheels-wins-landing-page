
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "./LogoutButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const UserMenu = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center space-x-4">
      {/* Profile avatar */}
      <button
        onClick={() => navigate("/profile")}
        className="hover:ring-2 ring-blue-500 transition rounded-full"
        title="Your Profile"
      >
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      </button>
      
      {/* Log Out button */}
      <LogoutButton />
    </div>
  );
};

export default UserMenu;
