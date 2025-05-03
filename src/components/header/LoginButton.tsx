
import { Link } from "react-router-dom";

const LoginButton = () => {
  return (
    <Link
      to="/login"
      className="px-5 py-2 rounded-md border border-white text-white hover:bg-white/20 transition drop-shadow-md"
    >
      Log In
    </Link>
  );
};

export default LoginButton;
