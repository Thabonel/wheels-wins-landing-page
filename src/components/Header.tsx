
import { useState, useEffect } from "react";
import { useLocation, Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  const isHomePage = location.pathname === "/";
  const showTransparentHeader = isHomePage && !isAuthenticated;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "You", path: "/you" },
    { label: "Wheels", path: "/wheels" },
    { label: "Wins", path: "/wins" },
    { label: "Social", path: "/social" },
    { label: "Shop", path: "/shop" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-24 transition-all duration-300 ${
        showTransparentHeader
          ? "bg-transparent"
          : isHomePage && isScrolled
          ? "bg-white/90 backdrop-blur-sm shadow-sm"
          : "bg-white shadow-sm"
      }`}
    >
      <div className="container max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <img
            src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/wheels%20and%20wins%20Logo%20alpha.png"
            alt="Wheels & Wins"
            className="h-14 object-contain drop-shadow-md"
          />
        </Link>

        {/* Navigation */}
        {!isHomePage && isAuthenticated && (
          <nav className="flex space-x-6">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `text-lg font-semibold transition-colors ${
                    isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Auth Buttons */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              {/* Profile avatar */}
              <button
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 hover:ring-2 ring-blue-500 transition"
                title="Your Profile"
              >
                {user?.email?.[0]?.toUpperCase() || "U"}
              </button>
              {/* Log Out button */}
              <button
                onClick={logout}
                className="text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100 transition"
              >
                Log Out
              </button>
            </>
          ) : (
            isHomePage && (
              <Link
                to="/login"
                className={`px-5 py-2 rounded-md ${
                  showTransparentHeader
                    ? "border border-white text-white hover:bg-white/20"
                    : "border border-blue-600 text-blue-600 hover:bg-blue-50"
                } transition drop-shadow-md`}
              >
                Log In
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
