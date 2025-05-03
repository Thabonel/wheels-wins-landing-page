
import { useAuth } from "@/context/AuthContext";

const LogoutButton = () => {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className="text-sm px-4 py-2 rounded-md border border-gray-300 bg-white/80 hover:bg-gray-100 transition"
    >
      Log Out
    </button>
  );
};

export default LogoutButton;
