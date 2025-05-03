
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "./LogoutButton";

const UserMenu = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center space-x-4">
      {/* Profile avatar */}
      <button
        onClick={() => navigate("/profile")}
        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 hover:ring-2 ring-blue-500 transition"
        title="Your Profile"
      >
        {user?.email?.[0]?.toUpperCase() || "U"}
      </button>
      
      {/* Log Out button */}
      <LogoutButton />
    </div>
  );
};

export default UserMenu;
