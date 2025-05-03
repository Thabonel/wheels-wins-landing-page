
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-6">
      <div className="container max-w-7xl mx-auto px-4">
        <Separator className="mb-6 opacity-30" />
        
        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Wheels and Wins. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-4">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </a>
            <span className="text-muted-foreground text-sm opacity-30">|</span>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <span className="text-muted-foreground text-sm opacity-30">|</span>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
