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

// Weather Tools (now handled via backend API in toolExecutor)

// Web Search Tools
export * from './webSearchTools';

// Tool Executor
export * from './toolExecutor';

// Re-export key functions for easy access
export { default as profileTools } from './profileTools';
export { default as tripTools } from './tripTools';
// weatherTools now handled via backend API in toolExecutor
export { default as webSearchTools } from './webSearchTools';
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
  getUpcomingEvents: 'calendarTools.getUpcomingEvents',
  
  // Weather tools (handled via backend API)
  getCurrentWeather: 'backendWeatherProxy.getCurrentWeather',
  getWeatherForecast: 'backendWeatherProxy.getWeatherForecast',
  
  // Web Search tools
  performWebSearch: 'webSearchTools.performWebSearch',
  searchCurrentWeather: 'webSearchTools.searchCurrentWeather',
  searchNews: 'webSearchTools.searchNews'
} as const;