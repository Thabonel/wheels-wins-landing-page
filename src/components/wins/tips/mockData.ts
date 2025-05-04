import { TipCategory, LeaderboardUser } from "./types";

export const tipCategories: TipCategory[] = [
  {
    id: "fuel",
    name: "Fuel Savings",
    tips: [
      {
        id: "f1",
        title: "Gas Buddy + Credit Card Combo",
        content: "Use GasBuddy to find cheap gas, then pay with a 5% cash-back credit card for fuel purchases. This combo can save you up to 25-30 cents per gallon!",
        source: "Pam",
        likes: 43,
        isNew: true
      },
      {
        id: "f2",
        title: "Maintain Optimal Tire Pressure",
        content: "Keeping your tires at the recommended pressure can improve fuel efficiency by 3%. For an RV, that's significant savings over long trips.",
        source: "Community",
        likes: 28,
        isNew: false
      },
      {
        id: "f3",
        title: "Plan Travel Days for Tuesday/Wednesday",
        content: "Gas prices are typically lowest mid-week. By planning your travel days for Tuesday or Wednesday, you can save an average of 10-15 cents per gallon versus weekend fill-ups.",
        source: "Pam",
        likes: 17,
        isNew: true
      }
    ]
  },
  {
    id: "food",
    name: "Food & Groceries",
    tips: [
      {
        id: "food1",
        title: "Shop at Aldi in Urban Areas",
        content: "Whenever passing through larger towns, stock up at Aldi. Travelers report saving 30-40% compared to other grocery chains, especially on staples and produce.",
        source: "Community",
        likes: 52,
        isNew: false
      },
      {
        id: "food2",
        title: "Use a Vacuum Sealer for Bulk Meat",
        content: "Buy meat in bulk when on sale, portion and vacuum seal it. This extends freezer life to 6+ months and lets you take advantage of sales wherever you find them.",
        source: "Pam",
        likes: 36,
        isNew: false
      }
    ]
  },
  {
    id: "camp",
    name: "Camping Deals",
    tips: [
      {
        id: "camp1",
        title: "BLM Land Near National Parks",
        content: "Instead of staying inside National Parks ($35+ per night), look for Bureau of Land Management areas nearby. They're often free for 14-day stays and just 15-20 minutes away from park entrances.",
        source: "Pam",
        likes: 64,
        isNew: false
      },
      {
        id: "camp2",
        title: "Harvest Hosts for Free Overnight Stays",
        content: "With a $99/year Harvest Hosts membership, you can stay overnight for free at 3,000+ wineries, farms, and attractions. While there's an expectation to support the business ($20 purchase), it's still cheaper than most campgrounds and you get local experiences.",
        source: "Community",
        likes: 41,
        isNew: true
      }
    ]
  }
];

export const leaderboardData: LeaderboardUser[] = [
  { name: "RVAdventures", points: 1250, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
  { name: "WanderingFamily", points: 950, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
  { name: "RoadTripQueen", points: 820, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
  { name: "FrugalTraveler", points: 780, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
  { name: "BoondockerLife", points: 675, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" }
];
