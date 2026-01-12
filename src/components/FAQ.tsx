import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useRegion } from "@/context/RegionContext";

const FAQ = () => {
  const { region, regionConfig } = useRegion();
  const currency = regionConfig.currencySymbol;

  // Get region-specific bank text
  const getBankText = () => {
    switch (region) {
      case 'Australia':
        return 'Works with any Australian bank.';
      case 'New Zealand':
        return 'Works with any New Zealand bank.';
      case 'United States':
        return 'Works with any US bank.';
      case 'Canada':
        return 'Works with any Canadian bank.';
      case 'United Kingdom':
        return 'Works with any UK bank.';
      default:
        return 'Works with most major banks.';
    }
  };

  const faqs = [
    {
      question: "How much does Wheels & Wins cost?",
      answer:
        `Start with a free 30-day trial (no credit card required). After that, it's just ${currency}10/month or ${currency}100/year (save 17%). Cancel anytime with one click. Most RVers save more than ${currency}10 in their first week just from fuel savings alone.`,
      category: "pricing",
    },
    {
      question: "What happens after my free trial ends?",
      answer:
        `You'll get an email reminder 3 days before your trial ends. You can choose to subscribe for ${currency}10/month or let it expire, no automatic charges. All your saved data stays private and can be downloaded anytime.`,
      category: "pricing",
    },
    {
      question: "Can I really cancel anytime?",
      answer:
        "Yes! One-click cancellation from your account settings. No emails to customer support, no waiting periods. Your subscription ends immediately and you can still access your data for 30 days to export if needed.",
      category: "pricing",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "Absolutely. If you're not happy within the first 30 days of a paid subscription, we'll refund 100%, no questions asked. Just email support@wheelsandwins.com with your request.",
      category: "pricing",
    },
    {
      question: "Is my financial data secure?",
      answer:
        "Yes. We use bank-level 256-bit encryption for all data. Your credit card details are processed by Stripe (used by Amazon, Shopify) and never stored on our servers. We're fully GDPR compliant and regularly audited.",
      category: "security",
    },
    {
      question: "Who can see my location and travel plans?",
      answer:
        "Only you, unless you explicitly choose to share. All location data is private by default. You control exactly what appears on the social feed, share as much or as little as you want.",
      category: "security",
    },
    {
      question: "Can I delete my account and data?",
      answer:
        "Yes. Go to Settings - Privacy - Delete Account. This permanently removes all your data within 48 hours. You can also export everything first (trips, expenses, messages) before deleting.",
      category: "security",
    },
    {
      question: "How long does setup take?",
      answer:
        "About 2 minutes. Sign up with email, add your RV details (type, fuel type, MPG), and you're done. PAM will guide you through everything else as you go. No complicated configuration needed.",
      category: "setup",
    },
    {
      question: "Do I need to manually enter all my past expenses?",
      answer:
        `No! Upload your bank statements (CSV, Excel, or PDF) and we'll automatically categorize transactions. Just review and approve. ${getBankText()}`,
      category: "setup",
    },
    {
      question: "Can I use this with my partner/travel buddy?",
      answer:
        "Yes. Add your partner's email in Settings - Profile. You'll both see shared expenses, trips, and budgets. Each person gets their own PAM assistant with full access to shared data.",
      category: "setup",
    },
    {
      question: "Does PAM work offline?",
      answer:
        "Partially. You can view saved trips, expenses, and maps offline. Creating new trips or getting real-time weather requires internet. All data syncs automatically when you're back online.",
      category: "product",
    },
    {
      question: "What if PAM gives me wrong directions or bad advice?",
      answer:
        "PAM uses real-time data from Mapbox, OpenWeather, and government road services, the same sources as Google Maps. Always verify critical decisions (weather, road closures) with official sources. We're a planning tool, not a replacement for common sense.",
      category: "product",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Book page texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 28px,
            hsl(var(--border)) 28px,
            hsl(var(--border)) 29px
          )`,
        }}
      />

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 border border-border/20 rounded-full" />
      <div className="absolute bottom-10 right-10 w-32 h-32 border border-border/10 rounded-full" />

      <div className="container max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header with book styling */}
        <div className="text-center mb-16">
          {/* Decorative book icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-1 bg-primary/20 rounded-full" />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-4">
            Questions &{" "}
            <span className="font-medium text-primary">Answers</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to know about Wheels & Wins
          </p>
        </div>

        {/* FAQ Accordion with journal styling */}
        <div className="relative">
          {/* Decorative margin line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent hidden md:block" />

          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-none"
              >
                <div className="bg-card rounded-lg border border-border/50 shadow-warm overflow-hidden transition-all duration-200 hover:shadow-warm-lg hover:border-border">
                  <AccordionTrigger className="text-left hover:no-underline px-6 py-5 group">
                    <div className="flex items-start gap-4 w-full">
                      {/* Question number */}
                      <span className="flex-shrink-0 text-sm font-display text-muted-foreground/50 pt-0.5">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base md:text-lg font-display font-medium text-foreground pr-4 group-hover:text-primary transition-colors">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5">
                    <div className="pl-10 border-l-2 border-accent/30 ml-2">
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact section */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center bg-card rounded-xl px-8 py-6 shadow-warm border border-border/50">
            <p className="text-muted-foreground mb-2">Still have questions?</p>
            <a
              href="mailto:support@wheelsandwins.com"
              className="font-display font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              support@wheelsandwins.com
            </a>
          </div>
        </div>

        {/* Bottom decorative element */}
        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-px bg-border" />
            <div className="w-2 h-2 rounded-full bg-primary/30" />
            <div className="w-8 h-px bg-border" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
