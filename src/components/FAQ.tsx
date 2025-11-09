import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    // Pricing Questions (4)
    {
      question: "How much does Wheels & Wins cost?",
      answer: "Start with a free 30-day trial (no credit card required). After that, it's just A$10/month or A$100/year (save 17%). Cancel anytime with one click. Most RVers save more than A$10 in their first week just from fuel savings alone.",
      category: "pricing"
    },
    {
      question: "What happens after my free trial ends?",
      answer: "You'll get an email reminder 3 days before your trial ends. You can choose to subscribe for A$10/month or let it expire, no automatic charges. All your saved data stays private and can be downloaded anytime.",
      category: "pricing"
    },
    {
      question: "Can I really cancel anytime?",
      answer: "Yes! One-click cancellation from your account settings. No emails to customer support, no waiting periods. Your subscription ends immediately and you can still access your data for 30 days to export if needed.",
      category: "pricing"
    },
    {
      question: "Do you offer refunds?",
      answer: "Absolutely. If you're not happy within the first 30 days of a paid subscription, we'll refund 100%, no questions asked. Just email support@wheelsandwins.com with your request.",
      category: "pricing"
    },

    // Security Questions (3)
    {
      question: "Is my financial data secure?",
      answer: "Yes. We use bank-level 256-bit encryption for all data. Your credit card details are processed by Stripe (used by Amazon, Shopify) and never stored on our servers. We're fully GDPR compliant and regularly audited.",
      category: "security"
    },
    {
      question: "Who can see my location and travel plans?",
      answer: "Only you, unless you explicitly choose to share. All location data is private by default. You control exactly what appears on the social feed, share as much or as little as you want.",
      category: "security"
    },
    {
      question: "Can I delete my account and data?",
      answer: "Yes. Go to Settings → Privacy → Delete Account. This permanently removes all your data within 48 hours. You can also export everything first (trips, expenses, messages) before deleting.",
      category: "security"
    },

    // Setup Questions (3)
    {
      question: "How long does setup take?",
      answer: "About 2 minutes. Sign up with email, add your RV details (type, fuel type, MPG), and you're done. PAM will guide you through everything else as you go. No complicated configuration needed.",
      category: "setup"
    },
    {
      question: "Do I need to manually enter all my past expenses?",
      answer: "No! Upload your bank statements (CSV, Excel, or PDF) and we'll automatically categorize transactions. Just review and approve. Works with any Australian bank.",
      category: "setup"
    },
    {
      question: "Can I use this with my partner/travel buddy?",
      answer: "Yes. Add your partner's email in Settings → Profile. You'll both see shared expenses, trips, and budgets. Each person gets their own PAM assistant with full access to shared data.",
      category: "setup"
    },

    // Product Questions (2)
    {
      question: "Does PAM work offline?",
      answer: "Partially. You can view saved trips, expenses, and maps offline. Creating new trips or getting real-time weather requires internet. All data syncs automatically when you're back online.",
      category: "product"
    },
    {
      question: "What if PAM gives me wrong directions or bad advice?",
      answer: "PAM uses real-time data from Mapbox, OpenWeather, and government road services, the same sources as Google Maps. Always verify critical decisions (weather, road closures) with official sources. We're a planning tool, not a replacement for common sense.",
      category: "product"
    }
  ];

  return (
    <section className="w-full py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about Wheels & Wins
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-gray-200 rounded-lg px-6 bg-gray-50"
            >
              <AccordionTrigger className="text-left hover:no-underline py-4">
                <span className="text-lg font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 pb-4 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <a
            href="mailto:support@wheelsandwins.com"
            className="text-accent font-semibold hover:underline"
          >
            Email us at support@wheelsandwins.com
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
