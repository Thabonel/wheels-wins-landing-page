import { Separator } from "@/components/ui/separator";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-4 bg-white border-t">
      <div className="container max-w-7xl mx-auto px-4">
        <Separator className="mb-4 opacity-20" />

        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center space-y-2 md:space-y-0 text-sm text-muted-foreground">
          <p>© {currentYear} Wheels and Wins. All rights reserved.</p>

          <div className="flex items-center space-x-3">
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <span className="opacity-40">|</span>
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <span className="opacity-40">|</span>
            <a href="#" className="hover:text-primary transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
