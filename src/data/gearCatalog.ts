// Amazon Australia Associates affiliate tag (matches AmazonProductsManagement.tsx)
const AMAZON_AU_TAG = "wheelsandwins-22";

function amazonAuSearch(query: string): string {
  return `https://www.amazon.com.au/s?k=${encodeURIComponent(query)}&tag=${AMAZON_AU_TAG}`;
}

function googleSearch(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export interface GearItem {
  id: string;
  category: string;
  title: string;
  why: string;
  amazonAuSearchUrl: string;
  localSearchUrl?: string;
  /** Override for non-Amazon items (e.g. direct supplier link) */
  primaryUrl?: string;
  /** Override the primary button label (default: "Check on Amazon Australia") */
  primaryCtaLabel?: string;
}

export const gearCatalog: GearItem[] = [
  // --- Leveling & Stabilization ---
  {
    id: "maxxhaul-wheel-chocks",
    category: "Leveling & Stabilization",
    title: "Rubber Wheel Chocks",
    why: "Heavy-duty rubber chocks keep your rig from rolling on any surface. Essential safety gear for every stop.",
    amazonAuSearchUrl: amazonAuSearch("Maxxhaul rubber wheel chocks RV"),
    localSearchUrl: googleSearch("Maxxhaul rubber wheel chocks RV"),
  },
  {
    id: "carmtek-leveling-ramps",
    category: "Leveling & Stabilization",
    title: "RV Leveling Ramps",
    why: "Drive-on ramps make leveling quick and painless - no more stacking wood or guessing heights.",
    amazonAuSearchUrl: amazonAuSearch("Carmtek RV leveling ramps"),
    localSearchUrl: googleSearch("RV caravan leveling ramps"),
  },
  {
    id: "x-chocks",
    category: "Leveling & Stabilization",
    title: "X-Chock Tire Stabilizers",
    why: "Scissor-style chocks wedge between dual tires to eliminate rocking and sway when parked.",
    amazonAuSearchUrl: amazonAuSearch("X-Chock tire stabilizer RV"),
    localSearchUrl: googleSearch("X-Chock tire stabilizer caravan"),
  },
  {
    id: "rv-snap-pads",
    category: "Leveling & Stabilization",
    title: "RV Snap Pads (Jack Pads)",
    why: "Permanent jack pads that snap onto your leveling jacks - protect surfaces and speed up setup.",
    amazonAuSearchUrl: amazonAuSearch("RV snap pads jack pads leveling"),
    localSearchUrl: googleSearch("RV snap pads jack pads"),
    primaryUrl: "https://rvsnappad.com/discount/RVTT10",
    primaryCtaLabel: "Visit supplier (discount link)",
  },

  // --- Water & Plumbing ---
  {
    id: "camco-tastepure-filter",
    category: "Water & Plumbing",
    title: "Inline RV Water Filter",
    why: "Filters sediment and improves taste from any campground tap. Cheap insurance for your plumbing.",
    amazonAuSearchUrl: amazonAuSearch("Camco TastePure RV inline water filter"),
    localSearchUrl: googleSearch("RV caravan inline water filter"),
  },
  {
    id: "water-pressure-regulator",
    category: "Water & Plumbing",
    title: "Water Pressure Regulator",
    why: "Protects your RV plumbing from high-pressure campground hookups that can burst fittings.",
    amazonAuSearchUrl: amazonAuSearch("RV water pressure regulator adjustable"),
    localSearchUrl: googleSearch("RV caravan water pressure regulator"),
  },
  {
    id: "evoflex-water-hose",
    category: "Water & Plumbing",
    title: "Drinking-Safe RV Water Hose",
    why: "Lightweight, kink-free, and certified safe for drinking water - a big upgrade over garden hoses.",
    amazonAuSearchUrl: amazonAuSearch("Evoflex RV drinking water hose"),
    localSearchUrl: googleSearch("RV caravan drinking water hose"),
  },
  {
    id: "low-point-drain-valve",
    category: "Water & Plumbing",
    title: "Stainless Low-Point Drain Valve",
    why: "Replaces flimsy plastic drain valves with durable stainless steel. Makes winterizing much easier.",
    amazonAuSearchUrl: amazonAuSearch("stainless steel low point drain valve RV"),
    localSearchUrl: googleSearch("RV stainless low point drain valve"),
  },
  {
    id: "winterizing-blow-out-plug",
    category: "Water & Plumbing",
    title: "Winterizing Blow-Out Plug",
    why: "Connects an air compressor to your water inlet to blow out lines before winter storage. Prevents freeze damage.",
    amazonAuSearchUrl: amazonAuSearch("RV winterizing blow out plug adapter"),
    localSearchUrl: googleSearch("RV winterizing blow out plug"),
  },

  // --- Sanitation ---
  {
    id: "thetford-toilet-seal",
    category: "Sanitation",
    title: "Toilet Seal Conditioner",
    why: "Keeps the rubber seal on your RV toilet soft and leak-free. Prevents odours from creeping in.",
    amazonAuSearchUrl: amazonAuSearch("Thetford toilet seal conditioner lubricant"),
    localSearchUrl: googleSearch("RV toilet seal conditioner lubricant"),
  },
  {
    id: "liquid-toilet-treatment",
    category: "Sanitation",
    title: "Liquid Toilet Treatment",
    why: "Breaks down waste and controls odour in your black tank. Liquid formula is easier to dose than drop-ins.",
    amazonAuSearchUrl: amazonAuSearch("RV liquid toilet treatment holding tank"),
    localSearchUrl: googleSearch("RV caravan toilet chemical treatment"),
  },

  // --- Cleaning & Protection ---
  {
    id: "303-protectant",
    category: "Cleaning & Protection",
    title: "UV Protectant Spray",
    why: "Shields rubber seals, vinyl, and dashboards from UV damage and cracking. Use it on tires, awnings, and trim.",
    amazonAuSearchUrl: amazonAuSearch("303 Automotive UV protectant spray"),
    localSearchUrl: googleSearch("303 UV protectant spray automotive"),
  },
  {
    id: "303-protectant-bulk",
    category: "Cleaning & Protection",
    title: "UV Protectant - Bulk Size",
    why: "Same great 303 formula in a larger container - better value when you have a whole RV to protect.",
    amazonAuSearchUrl: amazonAuSearch("303 protectant gallon bulk refill"),
    localSearchUrl: googleSearch("303 protectant bulk size"),
  },
  {
    id: "frost-king-coil-cleaner",
    category: "Cleaning & Protection",
    title: "Foaming Coil Cleaner",
    why: "Spray-on foam that cleans your RV air conditioner coils. Keeps your AC running cold and efficient.",
    amazonAuSearchUrl: amazonAuSearch("Frost King foaming coil cleaner air conditioner"),
    localSearchUrl: googleSearch("foaming AC coil cleaner RV"),
  },
  {
    id: "crc-electronics-cleaner",
    category: "Cleaning & Protection",
    title: "Electronics Contact Cleaner",
    why: "Cleans corrosion from electrical connections, switches, and circuit boards. Invaluable for troubleshooting.",
    amazonAuSearchUrl: amazonAuSearch("CRC electronics contact cleaner spray"),
    localSearchUrl: googleSearch("CRC electronics contact cleaner"),
  },
  {
    id: "boeshield-t9",
    category: "Cleaning & Protection",
    title: "Boeshield T-9 Lubricant & Protectant",
    why: "Developed by Boeing for corrosion protection. Lubricates and protects slides, hinges, and metal parts.",
    amazonAuSearchUrl: amazonAuSearch("Boeshield T9 lubricant protectant corrosion"),
    localSearchUrl: googleSearch("Boeshield T-9 lubricant protectant"),
  },

  // --- Tools & Accessories ---
  {
    id: "klein-11-in-1",
    category: "Tools & Accessories",
    title: "11-in-1 Multi-Bit Screwdriver",
    why: "One tool handles Phillips, flat, square, and Torx. Saves space in the tool drawer.",
    amazonAuSearchUrl: amazonAuSearch("Klein Tools 11 in 1 screwdriver multi bit"),
    localSearchUrl: googleSearch("Klein Tools 11 in 1 screwdriver"),
  },
  {
    id: "command-broom-holder",
    category: "Tools & Accessories",
    title: "Adhesive Broom & Mop Holder",
    why: "Mounts to any wall without drilling. Keeps brooms, mops, and tools from rattling around during travel.",
    amazonAuSearchUrl: amazonAuSearch("Command broom gripper holder adhesive"),
    localSearchUrl: googleSearch("adhesive broom holder wall mount"),
  },
  {
    id: "kamenstein-paper-towel-holder",
    category: "Tools & Accessories",
    title: "Tension-Arm Paper Towel Holder",
    why: "Spring-loaded arm stops the roll from unravelling when you hit a bumpy road.",
    amazonAuSearchUrl: amazonAuSearch("Kamenstein paper towel holder tension arm"),
    localSearchUrl: googleSearch("RV paper towel holder tension arm"),
  },
  {
    id: "rv-screen-door-handle",
    category: "Tools & Accessories",
    title: "RV Screen Door Handle",
    why: "Replacement handle for the flimsy factory screen door latch. A quick upgrade that saves frustration.",
    amazonAuSearchUrl: amazonAuSearch("RV screen door handle replacement"),
    localSearchUrl: googleSearch("RV caravan screen door handle replacement"),
  },
  {
    id: "rv-dimmer-switch",
    category: "Tools & Accessories",
    title: "RV Dimmer Switch",
    why: "Replace harsh on/off switches with a dimmer for mood lighting and to save battery when boondocking.",
    amazonAuSearchUrl: amazonAuSearch("RV 12V dimmer switch replacement LED"),
    localSearchUrl: googleSearch("RV 12V dimmer switch LED"),
  },
];

/** All unique categories in display order */
export const gearCategories = [
  "Leveling & Stabilization",
  "Water & Plumbing",
  "Sanitation",
  "Cleaning & Protection",
  "Tools & Accessories",
] as const;
