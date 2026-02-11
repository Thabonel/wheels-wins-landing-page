
import { ExpenseItem } from "./ExpenseTable";

// Comprehensive RV travel expense categories
export const defaultCategories = [
  // Essential Travel
  "Fuel", "Toll", "Parking", "Insurance",

  // Accommodation & Camping
  "Campgrounds", "RV Parks", "Hotels", "Boondocking",

  // Food & Dining
  "Groceries", "Restaurants", "Coffee", "Snacks",

  // Maintenance & Repairs
  "Maintenance", "Repairs", "Oil Change", "Tires", "Parts",

  // RV Equipment & Gear
  "RV Gear", "Tools", "Electronics", "Safety", "Comfort",

  // Activities & Entertainment
  "Attractions", "Tours", "Activities", "Entertainment", "Souvenirs",

  // Utilities & Services
  "Propane", "Dump Station", "Laundry", "WiFi", "Phone",

  // Health & Personal
  "Medical", "Pharmacy", "Personal Care", "Clothing",

  // General
  "Supplies", "Miscellaneous", "Emergency", "Other"
];

// Category colors for visual distinction
export const categoryColors: Record<string, string> = {
  // Essential Travel
  "Fuel": "bg-blue-50 text-blue-600 border-blue-200",
  "Toll": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "Parking": "bg-slate-50 text-slate-600 border-slate-200",
  "Insurance": "bg-violet-50 text-violet-600 border-violet-200",

  // Accommodation & Camping
  "Campgrounds": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "RV Parks": "bg-green-50 text-green-600 border-green-200",
  "Hotels": "bg-purple-50 text-purple-600 border-purple-200",
  "Boondocking": "bg-teal-50 text-teal-600 border-teal-200",

  // Food & Dining
  "Groceries": "bg-lime-50 text-lime-600 border-lime-200",
  "Restaurants": "bg-green-50 text-green-600 border-green-200",
  "Coffee": "bg-orange-50 text-orange-600 border-orange-200",
  "Snacks": "bg-yellow-50 text-yellow-600 border-yellow-200",

  // Maintenance & Repairs
  "Maintenance": "bg-red-50 text-red-600 border-red-200",
  "Repairs": "bg-rose-50 text-rose-600 border-rose-200",
  "Oil Change": "bg-amber-50 text-amber-600 border-amber-200",
  "Tires": "bg-stone-50 text-stone-600 border-stone-200",
  "Parts": "bg-zinc-50 text-zinc-600 border-zinc-200",

  // RV Equipment & Gear
  "RV Gear": "bg-cyan-50 text-cyan-600 border-cyan-200",
  "Tools": "bg-gray-50 text-gray-600 border-gray-200",
  "Electronics": "bg-blue-50 text-blue-600 border-blue-200",
  "Safety": "bg-red-50 text-red-600 border-red-200",
  "Comfort": "bg-pink-50 text-pink-600 border-pink-200",

  // Activities & Entertainment
  "Attractions": "bg-purple-50 text-purple-600 border-purple-200",
  "Tours": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "Activities": "bg-violet-50 text-violet-600 border-violet-200",
  "Entertainment": "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200",
  "Souvenirs": "bg-pink-50 text-pink-600 border-pink-200",

  // Utilities & Services
  "Propane": "bg-orange-50 text-orange-600 border-orange-200",
  "Dump Station": "bg-brown-50 text-brown-600 border-brown-200",
  "Laundry": "bg-blue-50 text-blue-600 border-blue-200",
  "WiFi": "bg-sky-50 text-sky-600 border-sky-200",
  "Phone": "bg-green-50 text-green-600 border-green-200",

  // Health & Personal
  "Medical": "bg-red-50 text-red-600 border-red-200",
  "Pharmacy": "bg-green-50 text-green-600 border-green-200",
  "Personal Care": "bg-pink-50 text-pink-600 border-pink-200",
  "Clothing": "bg-purple-50 text-purple-600 border-purple-200",

  // General
  "Supplies": "bg-gray-50 text-gray-600 border-gray-200",
  "Miscellaneous": "bg-slate-50 text-slate-600 border-slate-200",
  "Emergency": "bg-red-50 text-red-600 border-red-200",
  "Other": "bg-gray-50 text-gray-600 border-gray-200",

  // Legacy categories for backward compatibility
  "Food": "bg-green-50 text-green-600 border-green-200",
  "Camp": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "Fun": "bg-purple-50 text-purple-600 border-purple-200",
  "Park": "bg-emerald-50 text-emerald-600 border-emerald-200",
  "Gear": "bg-cyan-50 text-cyan-600 border-cyan-200",
};
