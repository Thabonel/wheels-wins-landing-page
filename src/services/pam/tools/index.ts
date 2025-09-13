/**
 * PAM Tools Index
 * Central export point for all PAM tool functions and types
 */

// Tool Registry
export * from './toolRegistry';

// Profile Tools
export * from './profileTools';

// Trip Tools  
export * from './tripTools';

// Tool Executor
export * from './toolExecutor';

// Re-export key functions for easy access
export { default as profileTools } from './profileTools';
export { default as tripTools } from './tripTools';
export { default as PAM_TOOLS } from './toolRegistry';
export { default as toolExecutor } from './toolExecutor';

// Tool execution mapping (for Claude tool calls)
export const TOOL_EXECUTION_MAP = {
  // Profile tools
  getUserProfile: 'profileTools.getUserProfile',
  getUserSettings: 'profileTools.getUserSettings', 
  getUserPreferences: 'profileTools.getUserPreferences',
  
  // Trip tools
  getTripHistory: 'tripTools.getTripHistory',
  getVehicleData: 'tripTools.getVehicleData',
  getFuelData: 'tripTools.getFuelData',
  getTripPlans: 'tripTools.getTripPlans',
  
  // Financial tools (to be implemented)
  getUserExpenses: 'financialTools.getUserExpenses',
  getUserBudgets: 'financialTools.getUserBudgets',
  getIncomeData: 'financialTools.getIncomeData',
  calculateSavings: 'financialTools.calculateSavings',
  
  // Calendar tools (to be implemented)
  getUpcomingEvents: 'calendarTools.getUpcomingEvents'
} as const;