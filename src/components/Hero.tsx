import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Hero = () => {
  const { t } = useTranslation();

  return <section className="w-full h-screen flex items-start justify-center overflow-hidden pt-32">
      <div className="absolute inset-0 bg-cover bg-center" style={{
      backgroundImage: `url('/images/hero-unimog-fire.jpg')`
    }}>
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">{t('landing.hero.title')}</h1>
        <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">{t('landing.hero.subtitle')}</p>
        <Link to="/signup">
          <Button size="lg" className="text-xl font-semibold px-10 py-7 bg-accent text-accent-foreground hover:bg-accent/90">
            {t('landing.hero.cta')}
          </Button>
        </Link>
      </div>
    </section>;
};
export default Hero;