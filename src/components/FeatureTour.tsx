import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Map,
  Wallet,
  Users,
  User,
  ShoppingCart,
  Route,
  FolderHeart,
  Fuel,
  Wrench,
  Package,
  Shield,
  GitCompare,
  Receipt,
  PiggyBank,
  Target,
  Lightbulb,
  BarChart3,
  MessageSquare,
  UserPlus,
  Store,
  Briefcase,
  BookOpen,
  Calendar,
  FileHeart,
  Compass,
  ClipboardList,
  Rocket,
  ShoppingBag,
  GraduationCap,
  DollarSign,
} from "lucide-react";

type TabId = "plan" | "track" | "connect" | "manage" | "shop";

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  features: Feature[];
}

const tabs: Tab[] = [
  {
    id: "plan",
    label: "Plan",
    icon: Map,
    features: [
      {
        icon: Route,
        title: "Interactive Trip Planner",
        description: "Drag-and-drop route building with live maps",
      },
      {
        icon: FolderHeart,
        title: "My Trips Library",
        description: "Save unlimited trips, load them anytime",
      },
      {
        icon: Fuel,
        title: "Fuel Log",
        description: "Track consumption, calculate your real MPG",
      },
      {
        icon: Wrench,
        title: "Vehicle Maintenance",
        description: "Service reminders and history tracking",
      },
      {
        icon: Package,
        title: "RV Storage Organizer",
        description: "Know where everything is stored",
      },
      {
        icon: Shield,
        title: "Caravan Safety",
        description: "Pre-trip checklists and emergency procedures",
      },
      {
        icon: GitCompare,
        title: "Route Comparison",
        description: "Compare multiple routes side-by-side",
      },
    ],
  },
  {
    id: "track",
    label: "Track",
    icon: Wallet,
    features: [
      {
        icon: Receipt,
        title: "Expense Tracking",
        description: "Categorize every dollar you spend",
      },
      {
        icon: DollarSign,
        title: "Income Tracking",
        description: "Log all your income sources",
      },
      {
        icon: Target,
        title: "Budget Management",
        description: "Set spending limits and get alerts",
      },
      {
        icon: Lightbulb,
        title: "Money-Saving Tips",
        description: "PAM finds ways to help you save",
      },
      {
        icon: BarChart3,
        title: "Financial Reports",
        description: "Charts, trends, and spending insights",
      },
    ],
  },
  {
    id: "connect",
    label: "Connect",
    icon: Users,
    features: [
      {
        icon: MessageSquare,
        title: "Social Feed",
        description: "Share updates, photos, and stories",
      },
      {
        icon: UserPlus,
        title: "Groups",
        description: "Join interest-based communities",
      },
      {
        icon: Store,
        title: "Marketplace",
        description: "Buy and sell with fellow travelers",
      },
      {
        icon: Briefcase,
        title: "Hustle Board",
        description: "Find gigs and work opportunities",
      },
      {
        icon: BookOpen,
        title: "Knowledge Center",
        description: "Community wisdom library",
      },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    icon: User,
    features: [
      {
        icon: Calendar,
        title: "Calendar",
        description: "PAM-integrated event planning",
      },
      {
        icon: FileHeart,
        title: "Medical Records",
        description: "Secure document storage",
      },
      {
        icon: Compass,
        title: "Life Transition Tools",
        description: "Pre-departure planning suite",
      },
      {
        icon: ClipboardList,
        title: "Equipment Manager",
        description: "Track all your gear inventory",
      },
      {
        icon: Rocket,
        title: "Launch Week Planner",
        description: "Countdown to your departure",
      },
    ],
  },
  {
    id: "shop",
    label: "Shop",
    icon: ShoppingCart,
    features: [
      {
        icon: ShoppingBag,
        title: "Curated RV Gear",
        description: "Hand-picked products for the road",
      },
      {
        icon: GraduationCap,
        title: "Digital Courses",
        description: "Learn to make travel videos",
      },
      {
        icon: PiggyBank,
        title: "Make Money on the Road",
        description: "Income opportunities guide",
      },
    ],
  },
];

const FeatureTour = () => {
  const [activeTab, setActiveTab] = useState<TabId>("plan");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  const headerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const tabBarVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.35,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Decorative backgrounds */}
      <div className="absolute top-20 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />

      <div ref={sectionRef} className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          variants={headerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-4">
            Everything You Need for{" "}
            <span className="font-medium text-primary">Life on the Road</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Over 20 tools to plan trips, track finances, connect with community, and manage your nomad lifestyle.
          </p>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          className="mb-10 md:mb-14"
          variants={tabBarVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <div className="flex justify-center">
            <div className="inline-flex gap-2 p-1.5 bg-card rounded-xl border border-border/50 shadow-warm overflow-x-auto max-w-full">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative flex items-center gap-2 px-4 py-2.5 rounded-lg
                      font-medium text-sm whitespace-nowrap
                      transition-all duration-200 ease-out
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                      ${
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 bg-primary rounded-lg"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <Icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Tab content */}
        <div className="min-h-[400px] md:min-h-[320px]">
          <AnimatePresence mode="wait">
            {activeTabData && (
              <motion.div
                key={activeTab}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              >
                {activeTabData.features.map((feature, index) => {
                  const FeatureIcon = feature.icon;

                  return (
                    <motion.div
                      key={`${activeTab}-${index}`}
                      variants={cardVariants}
                      className="group"
                    >
                      <div
                        className={`
                          relative bg-card rounded-xl p-5 h-full
                          border border-border/50 shadow-warm
                          transition-all duration-300 ease-out
                          hover:shadow-warm-lg hover:-translate-y-1 hover:border-primary/20
                        `}
                      >
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                          <FeatureIcon className="w-5 h-5 text-primary" />
                        </div>

                        {/* Content */}
                        <h3 className="text-base font-display font-medium text-foreground mb-1.5">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feature count indicator */}
        <motion.div
          className="text-center mt-10 md:mt-14"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {tabs.reduce((acc, tab) => acc + tab.features.length, 0)}+
            </span>{" "}
            features designed for nomads, by nomads
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureTour;
