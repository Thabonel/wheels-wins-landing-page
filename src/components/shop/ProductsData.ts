
import { Region } from "@/context/RegionContext";
import { AffiliateProduct, DigitalProduct } from "./types";

// Product data with region availability
export const getAffiliateProducts = (): AffiliateProduct[] => [
  {
    id: "aff-1",
    title: "Portable Solar Panel Kit",
    description: "Lightweight 100W solar panels perfect for boondocking. Includes charge controller and cables.",
    image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
    externalLink: "https://example.com/solar-panel-kit",
    isPamRecommended: true,
    availableRegions: ["Australia", "New Zealand", "United States", "Canada"]
  },
  {
    id: "aff-2",
    title: "Compact RV Storage System",
    description: "Maximize your storage space with these collapsible containers designed for RVs.",
    image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
    externalLink: "https://example.com/rv-storage",
    availableRegions: ["Australia", "United States", "Canada", "United Kingdom"]
  },
  {
    id: "aff-3",
    title: "Senior-Friendly First Aid Kit",
    description: "Complete medical kit with large-print instructions. Essential for remote travel.",
    image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
    externalLink: "https://example.com/first-aid",
    isPamRecommended: true,
    availableRegions: ["Australia", "New Zealand", "United States", "Canada", "United Kingdom"]
  },
  {
    id: "aff-4",
    title: "Water Filtration System",
    description: "Ensure clean drinking water wherever you travel with this compact filtration system.",
    image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
    externalLink: "https://example.com/water-filter",
    availableRegions: ["Australia", "United States", "Canada"]
  },
];

export const getDigitalProducts = (region: Region): DigitalProduct[] => [
  {
    id: "dig-1",
    title: "Make Fun Travel Videos",
    description: "Learn to film, edit, and share adventures using just your smartphone.",
    image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
    price: 97,
    currency: region === "Australia" || region === "New Zealand" ? "AUD" : region === "United Kingdom" ? "GBP" : "USD",
    type: "Video Course",
    hasBonus: true,
    availableRegions: ["Australia", "New Zealand", "United States", "Canada", "United Kingdom"]
  },
  {
    id: "dig-2",
    title: "RV Trip Planner Pro",
    description: "Downloadable templates for planning your next road trip with budget estimates.",
    image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
    price: 24.99,
    currency: region === "Australia" || region === "New Zealand" ? "AUD" : region === "United Kingdom" ? "GBP" : "USD",
    type: "Travel Templates",
    availableRegions: ["Australia", "New Zealand", "United States", "Canada"]
  },
  {
    id: "dig-3",
    title: "Snowbird Budget Master",
    description: "Track and optimize your expenses while traveling south for winter.",
    image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
    price: 19.99,
    currency: region === "Australia" || region === "New Zealand" ? "AUD" : region === "United Kingdom" ? "GBP" : "USD",
    type: "Budget Planner",
    availableRegions: ["United States", "Canada"]
  },
  {
    id: "dig-4",
    title: "RV Setup & Breakdown Checklist",
    description: "Never forget a critical step with our comprehensive checklists.",
    image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
    price: 12.99,
    currency: region === "Australia" || region === "New Zealand" ? "AUD" : region === "United Kingdom" ? "GBP" : "USD",
    type: "Checklists",
    hasBonus: true,
    isNew: true,
    availableRegions: ["Australia", "New Zealand", "United States", "Canada", "United Kingdom"]
  },
];
