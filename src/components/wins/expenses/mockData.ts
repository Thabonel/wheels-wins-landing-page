
import { ExpenseItem } from "./ExpenseTable";

// Initial expense categories
export const defaultCategories = ["Fuel", "Food", "Camp", "Fun", "Other"];

// Category colors for visual distinction
export const categoryColors: Record<string, string> = {
  "Fuel": "bg-blue-50 text-blue-600 border-blue-200",
  "Food": "bg-green-50 text-green-600 border-green-200",
  "Camp": "bg-purple-50 text-purple-600 border-purple-200",
  "Fun": "bg-amber-50 text-amber-600 border-amber-200",
  "Other": "bg-gray-50 text-gray-600 border-gray-200",
  
  // Colors for potential custom categories
  "Coffee": "bg-orange-50 text-orange-600 border-orange-200",
  "Maintenance": "bg-red-50 text-red-600 border-red-200", 
  "Gear": "bg-cyan-50 text-cyan-600 border-cyan-200",
  "Toll": "bg-indigo-50 text-indigo-600 border-indigo-200",
  "Park": "bg-emerald-50 text-emerald-600 border-emerald-200",
};
