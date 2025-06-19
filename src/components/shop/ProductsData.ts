
import { Region } from "@/context/RegionContext";
import { AffiliateProduct, DigitalProduct } from "./types";

export function getDigitalProducts(region: Region): DigitalProduct[] {
  return [
    {
      id: "trip-planner-pro",
      title: "Advanced Trip Planner Pro",
      description: "Premium trip planning tools with offline maps, weather integration, and route optimization for RV travelers.",
      image: "/placeholder-product.jpg",
      price: 29.99,
      currency: "USD",
      type: "software",
      availableRegions: ["US", "Canada", "Australia"],
      isNew: true
    },
    {
      id: "budget-tracker",
      title: "RV Budget Tracker & Analytics",
      description: "Comprehensive financial tracking designed specifically for nomadic lifestyles with expense categorization.",
      image: "/placeholder-product.jpg",
      price: 19.99,
      currency: "USD",
      type: "software",
      availableRegions: ["US", "Canada", "Australia"]
    },
    {
      id: "maintenance-guide",
      title: "Complete RV Maintenance Guide",
      description: "Digital handbook covering all aspects of RV maintenance with step-by-step tutorials and checklists.",
      image: "/placeholder-product.jpg",
      price: 24.99,
      currency: "USD",
      type: "ebook",
      availableRegions: ["US", "Canada", "Australia"],
      hasBonus: true
    }
  ];
}

export function getAffiliateProducts(): AffiliateProduct[] {
  return [
    {
      id: "solar-panel-kit",
      title: "Renogy 400W Solar Panel Kit",
      description: "Complete solar power solution for RVs with high-efficiency panels and charge controller.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/solar-kit",
      availableRegions: ["US", "Canada"],
      isPamRecommended: true
    },
    {
      id: "portable-generator",
      title: "Honda EU2200i Portable Generator",
      description: "Quiet, fuel-efficient generator perfect for boondocking and emergency power needs.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/generator",
      availableRegions: ["US", "Canada", "Australia"]
    },
    {
      id: "water-filter",
      title: "Berkey Water Filter System",
      description: "Reliable water filtration for safe drinking water anywhere your travels take you.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/water-filter",
      availableRegions: ["US", "Canada", "Australia"],
      isPamRecommended: true
    }
  ];
}
