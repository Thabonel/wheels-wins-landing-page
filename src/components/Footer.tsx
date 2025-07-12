import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-4 bg-white border-t">
      <div className="container max-w-7xl mx-auto px-4">
        <Separator className="mb-4 opacity-20" />

        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center space-y-2 md:space-y-0 text-sm text-muted-foreground">
          <p>© {currentYear} Wheels and Wins. All rights reserved.</p>

          <div className="flex items-center space-x-3">
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <span className="opacity-40">|</span>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="opacity-40">|</span>
            <Link to="/cookies" className="hover:text-primary transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
