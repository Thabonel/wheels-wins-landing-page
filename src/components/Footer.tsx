import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SupportTicketDialog } from "@/components/support/SupportTicketDialog";

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 bg-foreground text-primary-foreground relative overflow-hidden">
      {/* Subtle texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="container max-w-7xl mx-auto px-4 relative">
        {/* Decorative separator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-px bg-primary-foreground/20" />
            <div className="w-2 h-2 rounded-full bg-accent/50" />
            <div className="w-12 h-px bg-primary-foreground/20" />
          </div>
        </div>

        <Separator className="mb-6 opacity-10" />

        {/* Support Message */}
        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-4 mb-6 pb-6 border-b border-primary-foreground/10">
          <p className="text-sm text-primary-foreground/70 text-center md:text-left font-body">
            If something doesn't work, let me know and I will fix it
            immediately.
          </p>
          <SupportTicketDialog />
        </div>

        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center space-y-3 md:space-y-0 text-sm">
          <p className="text-primary-foreground/60 font-body">
            © {currentYear} {t("footer.copyright")}
          </p>

          <div className="flex items-center space-x-4">
            <Link
              to="/terms"
              className="text-primary-foreground/60 hover:text-accent transition-colors font-body"
            >
              {t("footer.terms")}
            </Link>
            <span className="text-primary-foreground/20">|</span>
            <Link
              to="/privacy"
              className="text-primary-foreground/60 hover:text-accent transition-colors font-body"
            >
              {t("footer.privacy")}
            </Link>
            <span className="text-primary-foreground/20">|</span>
            <Link
              to="/cookies"
              className="text-primary-foreground/60 hover:text-accent transition-colors font-body"
            >
              {t("footer.cookies")}
            </Link>
          </div>
        </div>

        {/* Brand mark */}
        <div className="mt-8 flex justify-center">
          <span className="text-xs font-display text-primary-foreground/30 tracking-wider">
            WHEELS & WINS
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
