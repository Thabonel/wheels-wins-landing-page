
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

// Chart data for expense visualization
export const chartData = [
  { name: "Fuel", amount: 358.42 },
  { name: "Food", amount: 290.15 },
  { name: "Camp", amount: 175.00 },
  { name: "Fun", amount: 120.75 },
  { name: "Other", amount: 65.30 },
];

// Sample expense data
export const expensesData: ExpenseItem[] = [
  {
    id: 1,
    amount: 45.67,
    category: "Fuel",
    date: "2025-05-01",
    description: "Gas station - Highway 95"
  },
  {
    id: 2,
    amount: 85.23,
    category: "Food",
    date: "2025-05-01",
    description: "Grocery run for the week"
  },
  {
    id: 3,
    amount: 35.00,
    category: "Camp",
    date: "2025-04-30",
    description: "Campground fee - Riverside"
  },
  {
    id: 4,
    amount: 12.50,
    category: "Fun",
    date: "2025-04-29",
    description: "Movie tickets"
  },
  {
    id: 5,
    amount: 150.00,
    category: "Fuel",
    date: "2025-04-28",
    description: "Gas and propane refill"
  },
  {
    id: 6,
    amount: 65.30,
    category: "Other",
    date: "2025-04-27",
    description: "RV supplies"
  }
];
