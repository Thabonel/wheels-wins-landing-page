/**
 * WinsAgent - Enhanced Financial Management Domain Agent
 * Phase 4B Implementation: AI-powered financial insights with MCP integration
 * 
 * Features:
 * - PAM Savings Attribution and Impact Tracking
 * - Advanced Financial Analytics with Predictive Insights
 * - Intelligent Expense Categorization and Budget Optimization
 * - Real-time Financial Health Monitoring
 * - Smart Recommendations based on Travel and Spending Patterns
 */

import { DomainAgent } from './base';
import { ConversationContext, AgentResponse, Tool } from '../architectureTypes';
import { supabase } from '@/integrations/supabase/client';
import { fetchExpenses, createExpense, ExpenseInput } from '../../expensesService';

// Enhanced interfaces for Phase 4B
interface ExpenseAnalysis {
  totalSpent: number;
  averageDaily: number;
  categoryBreakdown: Record<string, number>;
  spendingTrend: 'increasing' | 'decreasing' | 'stable';
  seasonality: string;
  predictedMonthly: number;
}

interface PamSavingsAttribution {
  totalSavings: number;
  savingsBreakdown: Record<string, number>;
  recommendationImpact: Array<{
    type: string;
    amount: number;
    confidence: number;
    date: string;
  }>;
  roi: number; // Return on Investment for PAM recommendations
}

interface FinancialHealthScore {
  score: number; // 0-100
  factors: Record<string, { value: number; weight: number; description: string }>;
  recommendations: string[];
  nextReviewDate: string;
}

interface SmartBudgetRecommendation {
  category: string;
  currentBudget: number;
  suggestedBudget: number;
  reasoning: string;
  potentialSavings: number;
  confidence: number;
}

export class WinsAgent extends DomainAgent {
  constructor() {
    super(
      'WinsAgent',
      'Enhanced AI-powered financial management with PAM savings attribution and predictive insights'
    );
  }

  protected async loadTools(): Promise<void> {
    // Enhanced Smart Expense Tracker with PAM Attribution
    this.registerTool({
      id: 'smart_expense_tracker',
      name: 'Smart Expense Tracker',
      description: 'AI-powered expense tracking with automatic categorization and PAM savings attribution',
      category: 'finance',
      execute: async (params) => {
        const { 
          amount, 
          category, 
          description, 
          date, 
          userId,
          pamRecommended = false,
          originalAmount,
          savingsAmount = 0,
          recommendationType = 'general'
        } = params;
        
        try {
          // Auto-categorize if category not provided
          const finalCategory = category || await this.smartCategorizeExpense(description, amount);
          
          // Prepare expense data with PAM attribution
          const expenseData: ExpenseInput = {
            amount,
            category: finalCategory,
            date: date || new Date().toISOString().split('T')[0],
            description: description || ''
          };
          
          // Create expense using existing service
          const expense = await createExpense(userId, expenseData);
          
          // Record PAM savings attribution if applicable
          let pamAttribution = null;
          if (pamRecommended && savingsAmount > 0) {
            pamAttribution = await this.recordPamSavings(userId, {
              expenseId: expense.id,
              originalAmount,
              finalAmount: amount,
              savingsAmount,
              recommendationType,
              confidence: this.calculateConfidence(recommendationType)
            });
          }
          
          // Generate insights
          const insights = await this.generateExpenseInsights(userId, expense);
          
          return { 
            success: true, 
            expense,
            pamAttribution,
            insights,
            smartCategory: finalCategory !== category,
            suggestions: this.generatePostExpenseSuggestions(expense)
          };
        } catch (error) {
          console.error('Smart expense tracking error:', error);
          return { success: false, error: 'Failed to track expense' };
        }
      },
      validate: (params) => params.amount > 0 && params.userId,
    });

    // Advanced Financial Analytics with MCP Integration
    this.registerTool({
      id: 'advanced_financial_analytics',
      name: 'Advanced Financial Analytics',
      description: 'AI-powered financial analysis with predictive insights and MCP data integration',
      category: 'finance',
      execute: async (params) => {
        const { userId, period = 'month', includeProjections = true } = params;
        try {
          // Get expenses using existing service
          const expenses = await fetchExpenses(userId);
          
          // Filter by period
          const periodStartDate = this.getPeriodStartDate(period);
          const periodExpenses = expenses.filter(expense => 
            new Date(expense.date) >= new Date(periodStartDate)
          );
          
          // Perform advanced analysis
          const analysis = await this.performAdvancedAnalysis(periodExpenses, period);
          
          // Get PAM savings attribution
          const pamSavings = await this.getPamSavingsAnalysis(userId, period);
          
          // Calculate financial health score
          const healthScore = await this.calculateFinancialHealthScore(userId, analysis);
          
          // Generate smart budget recommendations
          const budgetRecommendations = await this.generateSmartBudgetRecommendations(
            userId, 
            analysis,
            pamSavings
          );
          
          // Integration with MCP tools for enhanced data
          const externalInsights = await this.integrateExternalFinancialData(userId);
          
          return {
            analysis,
            pamSavings,
            healthScore,
            budgetRecommendations,
            externalInsights,
            actionableInsights: this.generateActionableInsights(analysis, pamSavings),
            nextSteps: this.generateNextSteps(healthScore, budgetRecommendations)
          };
        } catch (error) {
          console.error('Advanced financial analytics error:', error);
          return { error: 'Failed to perform advanced analysis' };
        }
      },
    });

    // PAM-Enhanced Savings Intelligence
    this.registerTool({
      id: 'pam_savings_intelligence',
      name: 'PAM Savings Intelligence',
      description: 'AI-powered savings goals with PAM impact tracking and optimization suggestions',
      category: 'finance',
      execute: async (params) => {
        const { userId, goalName, targetAmount, currentAmount, action = 'analyze' } = params;
        try {
          // Handle different actions
          if (action === 'create' || action === 'update') {
            // Get or create savings goal
            const { data, error } = await supabase
              .from('savings_goals')
              .upsert({
                user_id: userId,
                name: goalName,
                target_amount: targetAmount,
                current_amount: currentAmount || 0,
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (error) throw error;
            
            const progress = (data.current_amount / data.target_amount) * 100;
            const remaining = data.target_amount - data.current_amount;
            
            // Calculate PAM contribution to this goal
            const pamContribution = await this.calculatePamSavingsContribution(userId, goalName);
            
            // Generate personalized recommendations
            const recommendations = await this.generateSavingsRecommendations(
              userId, 
              data, 
              pamContribution
            );
            
            return {
              goal: data,
              progress: `${progress.toFixed(1)}%`,
              remaining,
              onTrack: progress >= this.expectedProgressForGoal(data),
              pamContribution,
              recommendations,
              projectedCompletion: this.calculateProjectedCompletion(data, pamContribution),
              optimizationTips: this.generateOptimizationTips(data, recommendations)
            };
          } else {
            // Analyze all savings goals
            const savingsAnalysis = await this.analyzeSavingsGoals(userId);
            return savingsAnalysis;
          }
        } catch (error) {
          console.error('PAM savings intelligence error:', error);
          return { error: 'Failed to process savings intelligence' };
        }
      },
    });

    // AI-Powered Financial Intelligence Hub
    this.registerTool({
      id: 'ai_financial_intelligence',
      name: 'AI Financial Intelligence Hub',
      description: 'Comprehensive AI-driven financial insights with predictive recommendations and MCP integration',
      category: 'finance',
      execute: async (params) => {
        const { userId, insightType = 'comprehensive', context } = params;
        try {
          // Get comprehensive financial data
          const expenses = await fetchExpenses(userId);
          const recentExpenses = expenses.slice(0, 30); // Last 30 expenses
          
          // PAM impact analysis
          const pamImpact = await this.analyzePamFinancialImpact(userId);
          
          // Generate contextual insights
          const insights = await this.generateContextualInsights(
            userId, 
            recentExpenses, 
            pamImpact,
            context
          );
          
          // Predictive analysis
          const predictions = await this.generatePredictiveInsights(userId, expenses);
          
          // Smart recommendations
          const recommendations = await this.generateSmartRecommendations(
            userId,
            insights,
            predictions,
            pamImpact
          );
          
          // Travel-specific financial tips
          const travelTips = await this.generateTravelSpecificTips(userId, expenses, context);
          
          return {
            insights: insights.general,
            pamImpact,
            predictions,
            recommendations,
            travelTips,
            savingsPotential: insights.savingsPotential,
            confidenceScore: insights.confidence,
            nextCheckIn: this.calculateNextCheckInDate(),
            actionItems: this.prioritizeActionItems(recommendations)
          };
        } catch (error) {
          console.error('AI financial intelligence error:', error);
          return this.generateFallbackInsights(userId);
        }
      },
    });
  }

  protected async analyzeRequest(message: string, context: ConversationContext): Promise<any> {
    // Enhanced analysis with AI pattern recognition
    const analysis = {
      // Core financial actions
      hasExpenseRequest: this.detectExpenseRequest(message),
      hasBudgetRequest: this.detectBudgetRequest(message),
      hasSavingsRequest: this.detectSavingsRequest(message),
      hasInsightRequest: this.detectInsightRequest(message),
      
      // Enhanced AI detection patterns
      hasPamAttributionRequest: /pam.*save|recommend.*cheaper|suggest.*alternative|pam.*help/i.test(message),
      hasAnalyticsRequest: /analyz|trend|pattern|predict|forecast|insight/i.test(message),
      hasOptimizationRequest: /optim|improve|reduce|cut|efficiency/i.test(message),
      hasGoalTrackingRequest: /goal|target|progress|achievement/i.test(message),
      
      // Context extraction
      extractedAmount: this.extractAmount(message),
      extractedCategory: this.extractCategory(message),
      timeframe: this.extractTimeframe(message),
      complexity: this.assessRequestComplexity(message),
      
      // Travel context
      travelContext: this.extractTravelContext(message, context),
      
      // PAM context
      pamContext: context.pamInteraction || false,
      
      // User intent classification
      primaryIntent: this.classifyPrimaryIntent(message),
      secondaryIntents: this.identifySecondaryIntents(message)
    };

    return analysis;
  }

  protected async selectTools(analysis: any, context: ConversationContext): Promise<string[]> {
    const tools: string[] = [];

    // Smart tool selection based on enhanced analysis
    if (analysis.hasExpenseRequest && analysis.extractedAmount) {
      tools.push('smart_expense_tracker');
    }
    
    if (analysis.hasBudgetRequest || analysis.hasAnalyticsRequest) {
      tools.push('advanced_financial_analytics');
    }
    
    if (analysis.hasSavingsRequest || analysis.hasGoalTrackingRequest) {
      tools.push('pam_savings_intelligence');
    }
    
    if (analysis.hasInsightRequest || analysis.hasOptimizationRequest || tools.length === 0) {
      tools.push('ai_financial_intelligence');
    }
    
    // Add analytics for complex requests
    if (analysis.complexity === 'high' && !tools.includes('advanced_financial_analytics')) {
      tools.push('advanced_financial_analytics');
    }
    
    // Ensure we have financial intelligence for PAM attribution requests
    if (analysis.hasPamAttributionRequest && !tools.includes('ai_financial_intelligence')) {
      tools.push('ai_financial_intelligence');
    }

    return tools;
  }

  protected async generateResponse(
    message: string,
    context: ConversationContext,
    toolResults: Map<string, any>
  ): Promise<AgentResponse> {
    let response = '';
    const toolsUsed: string[] = [];
    const suggestions: string[] = [];
    let confidenceScore = 0.7;

    // Process smart expense tracking results
    if (toolResults.has('smart_expense_tracker')) {
      const expenseData = toolResults.get('smart_expense_tracker');
      if (expenseData.success) {
        response += `💰 I've recorded your expense of $${expenseData.expense.amount} for ${expenseData.expense.category}. `;
        
        if (expenseData.smartCategory) {
          response += `I automatically categorized this expense. `;
        }
        
        if (expenseData.pamAttribution) {
          response += `🎯 PAM helped you save $${expenseData.pamAttribution.savingsAmount}! `;
          confidenceScore += 0.1;
        }
        
        if (expenseData.insights && expenseData.insights.length > 0) {
          response += `💡 ${expenseData.insights[0]} `;
        }
        
        suggestions.push(...(expenseData.suggestions || ['View expense analytics', 'Set spending alerts']));
      } else {
        response += '❌ I had trouble recording that expense. ';
      }
      toolsUsed.push('smart_expense_tracker');
    }

    // Process advanced financial analytics results
    if (toolResults.has('advanced_financial_analytics')) {
      const analyticsData = toolResults.get('advanced_financial_analytics');
      if (!analyticsData.error) {
        const { analysis, pamSavings, healthScore } = analyticsData;
        
        response += `📊 Your financial analysis: $${analysis.totalSpent.toFixed(2)} spent this period. `;
        
        if (pamSavings && pamSavings.totalSavings > 0) {
          response += `🎯 PAM has saved you $${pamSavings.totalSavings.toFixed(2)}! `;
        }
        
        response += `💪 Your financial health score: ${healthScore.score}/100. `;
        
        if (analyticsData.actionableInsights && analyticsData.actionableInsights.length > 0) {
          response += `🔍 ${analyticsData.actionableInsights[0]} `;
        }
        
        suggestions.push(...(analyticsData.nextSteps || ['Optimize spending', 'Set new savings goals']));
        confidenceScore += 0.15;
      }
      toolsUsed.push('advanced_financial_analytics');
    }

    // Process PAM savings intelligence results
    if (toolResults.has('pam_savings_intelligence')) {
      const savingsData = toolResults.get('pam_savings_intelligence');
      if (!savingsData.error) {
        if (savingsData.goal) {
          response += `🎯 Your savings goal "${savingsData.goal.name}" is ${savingsData.progress} complete. `;
          response += `$${savingsData.remaining.toFixed(2)} remaining. `;
          
          if (savingsData.pamContribution && savingsData.pamContribution > 0) {
            response += `PAM contributed $${savingsData.pamContribution.toFixed(2)} to this goal! `;
          }
          
          if (savingsData.onTrack) {
            response += '✅ You\'re on track! ';
          } else {
            response += '⚠️ Consider adjusting your savings strategy. ';
          }
        }
        
        suggestions.push(...(savingsData.optimizationTips || ['Review savings strategy', 'Set new milestones']));
        confidenceScore += 0.1;
      }
      toolsUsed.push('pam_savings_intelligence');
    }

    // Process AI financial intelligence results
    if (toolResults.has('ai_financial_intelligence')) {
      const intelligenceData = toolResults.get('ai_financial_intelligence');
      if (intelligenceData.insights) {
        response += `🧠 AI Insight: ${intelligenceData.insights[0] || 'Your spending patterns show room for optimization'}. `;
        
        if (intelligenceData.pamImpact && intelligenceData.pamImpact.totalSavings > 0) {
          response += `🎯 PAM's total impact: $${intelligenceData.pamImpact.totalSavings.toFixed(2)} saved! `;
        }
        
        if (intelligenceData.predictions && intelligenceData.predictions.nextMonth) {
          response += `📈 Predicted next month spending: $${intelligenceData.predictions.nextMonth.toFixed(2)}. `;
        }
        
        suggestions.push(...(intelligenceData.actionItems || intelligenceData.travelTips || ['Review recommendations', 'Optimize expenses']));
        confidenceScore += 0.1;
      }
      toolsUsed.push('ai_financial_intelligence');
    }

    // Enhanced fallback response
    if (response === '') {
      response = '💰 I\'m your enhanced financial intelligence assistant! I can track expenses with smart categorization, analyze your spending patterns, calculate PAM\'s savings impact, and help you reach your financial goals. What would you like to explore?';
      suggestions.push('💳 Track a new expense', '📊 View financial analytics', '🎯 Check savings goals', '🧠 Get AI insights');
    }

    // Add contextual ending based on PAM attribution
    const hasPamData = Array.from(toolResults.values()).some(result => 
      result.pamAttribution || result.pamSavings || result.pamImpact
    );
    
    if (hasPamData && !response.includes('PAM')) {
      response += ' 🎯 PAM is actively helping optimize your finances!';
    }

    return {
      response: response.trim(),
      confidence: Math.min(confidenceScore, 0.95),
      toolsUsed,
      suggestions: suggestions.length > 0 ? suggestions.slice(0, 4) : undefined,
      context: { 
        financialActivity: toolsUsed.length > 0,
        pamFinancialImpact: hasPamData,
        intelligenceLevel: 'enhanced'
      },
    };
  }

  // ============================================================================
  // PHASE 4B: ENHANCED AI METHODS FOR FINANCIAL INTELLIGENCE
  // ============================================================================

  // Enhanced request detection methods
  private detectExpenseRequest(message: string): boolean {
    const expensePatterns = [
      /spent|paid|bought|cost|expense|purchase|charged/i,
      /\$\d+.*(?:on|for|at)/i,
      /just.*(?:paid|spent|bought)/i,
      /cost.*me|charged.*me/i
    ];
    return expensePatterns.some(pattern => pattern.test(message));
  }

  private detectBudgetRequest(message: string): boolean {
    const budgetPatterns = [
      /budget|spending|how\s+much.*spent|total.*cost/i,
      /monthly.*expenses|weekly.*spending/i,
      /financial.*summary|expense.*report/i,
      /track.*spending|monitor.*budget/i
    ];
    return budgetPatterns.some(pattern => pattern.test(message));
  }

  private detectSavingsRequest(message: string): boolean {
    const savingsPatterns = [
      /save|saving|goal|target|progress/i,
      /money.*aside|emergency.*fund/i,
      /how.*much.*saved|savings.*account/i,
      /financial.*goal|save.*for/i
    ];
    return savingsPatterns.some(pattern => pattern.test(message));
  }

  private detectInsightRequest(message: string): boolean {
    const insightPatterns = [
      /advice|tips|recommend|insights?|suggest/i,
      /help.*me.*save|optimize.*spending/i,
      /financial.*advice|money.*tips/i,
      /improve.*finances|better.*budget/i
    ];
    return insightPatterns.some(pattern => pattern.test(message));
  }

  private assessRequestComplexity(message: string): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Multiple financial concepts
    const concepts = ['expense', 'budget', 'saving', 'goal', 'analysis', 'optimize', 'predict'];
    const conceptCount = concepts.filter(concept => message.toLowerCase().includes(concept)).length;
    complexity += conceptCount;
    
    // Time-based analysis
    if (/trend|pattern|over.*time|compare.*to|last.*month/i.test(message)) complexity += 2;
    
    // Multiple categories or complex scenarios
    if (/category|categories|breakdown|detailed|comprehensive/i.test(message)) complexity += 1;
    
    if (complexity >= 4) return 'high';
    if (complexity >= 2) return 'medium';
    return 'low';
  }

  private extractTravelContext(message: string, context: ConversationContext): any {
    return {
      isOnTrip: /trip|travel|road|driving|rv|camp/i.test(message) || context.userLocation !== 'home',
      location: this.extractLocation(message) || context.userLocation,
      activity: this.extractTravelActivity(message)
    };
  }

  private extractLocation(message: string): string | null {
    const locationPattern = /(?:in|at|near)\s+([A-Z][a-zA-Z\s]+)/;
    const match = message.match(locationPattern);
    return match ? match[1].trim() : null;
  }

  private extractTravelActivity(message: string): string | null {
    if (/fuel|gas|diesel/i.test(message)) return 'fueling';
    if (/camp|park|site/i.test(message)) return 'camping';
    if (/food|eat|restaurant/i.test(message)) return 'dining';
    if (/maintenance|repair/i.test(message)) return 'maintenance';
    if (/shopping|supplies|groceries/i.test(message)) return 'shopping';
    return null;
  }

  private classifyPrimaryIntent(message: string): string {
    if (this.detectExpenseRequest(message)) return 'track_expense';
    if (this.detectBudgetRequest(message)) return 'analyze_budget';
    if (this.detectSavingsRequest(message)) return 'manage_savings';
    if (this.detectInsightRequest(message)) return 'get_insights';
    return 'general_financial';
  }

  private identifySecondaryIntents(message: string): string[] {
    const intents: string[] = [];
    if (/optimize|improve|reduce/i.test(message)) intents.push('optimization');
    if (/predict|forecast|future/i.test(message)) intents.push('prediction');
    if (/compare|vs|versus/i.test(message)) intents.push('comparison');
    if (/alert|notify|remind/i.test(message)) intents.push('notification');
    return intents;
  }

  // ============================================================================
  // SMART EXPENSE CATEGORIZATION
  // ============================================================================

  private async smartCategorizeExpense(description: string, amount: number): Promise<string> {
    const desc = description?.toLowerCase() || '';
    
    // RV-specific categorization
    const rvCategories = {
      fuel: [
        'gas', 'diesel', 'fuel', 'gasoline', 'petrol', 'station', 'shell', 'bp', 'exxon', 'chevron', 'mobil',
        'pump', 'gallon', 'liter', 'fill', 'tank'
      ],
      food: [
        'restaurant', 'food', 'meal', 'eat', 'lunch', 'dinner', 'breakfast', 'grocery', 'market', 'cafe',
        'mcdonald', 'burger', 'pizza', 'sandwich', 'coffee', 'starbucks', 'walmart', 'safeway', 'kroger'
      ],
      camping: [
        'campground', 'rv park', 'camp', 'site', 'park', 'reservation', 'koa', 'overnight', 'hookup',
        'electric', 'sewer', 'water', 'dump', 'national park', 'state park'
      ],
      maintenance: [
        'repair', 'service', 'oil', 'tire', 'brake', 'maintenance', 'mechanic', 'parts', 'auto',
        'jiffy', 'valvoline', 'firestone', 'goodyear', 'discount tire'
      ],
      supplies: [
        'supplies', 'equipment', 'gear', 'hardware', 'tools', 'home depot', 'lowes', 'ace', 'rv supply',
        'camping world', 'amazon', 'walmart'
      ],
      entertainment: [
        'attraction', 'museum', 'tour', 'activity', 'ticket', 'admission', 'show', 'movie', 'park',
        'zoo', 'aquarium', 'entertainment'
      ],
      tolls: ['toll', 'bridge', 'turnpike', 'highway', 'pass', 'ezpass', 'fastrak'],
      insurance: ['insurance', 'policy', 'premium', 'coverage', 'geico', 'state farm', 'progressive'],
      communication: ['phone', 'internet', 'wifi', 'cellular', 'verizon', 'att', 'tmobile', 'data']
    };

    // Find matching category
    for (const [category, keywords] of Object.entries(rvCategories)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }

    // Amount-based heuristics for common RV expenses
    if (amount > 50 && amount < 200) return 'fuel';
    if (amount > 20 && amount < 100) return 'food';
    if (amount > 200) return 'maintenance';
    
    return 'other';
  }

  // ============================================================================
  // PAM SAVINGS ATTRIBUTION METHODS
  // ============================================================================

  private async recordPamSavings(userId: string, attribution: any): Promise<any> {
    try {
      // Store PAM attribution data (would connect to actual database)
      const pamRecord = {
        user_id: userId,
        expense_id: attribution.expenseId,
        original_amount: attribution.originalAmount,
        final_amount: attribution.finalAmount,
        savings_amount: attribution.savingsAmount,
        recommendation_type: attribution.recommendationType,
        confidence: attribution.confidence,
        created_at: new Date().toISOString()
      };

      // Mock implementation - would use actual database
      console.log('Recording PAM savings attribution:', pamRecord);
      
      return {
        success: true,
        savingsAmount: attribution.savingsAmount,
        totalPamSavings: await this.getTotalPamSavings(userId)
      };
    } catch (error) {
      console.error('Error recording PAM savings:', error);
      return null;
    }
  }

  private calculateConfidence(recommendationType: string): number {
    const confidenceMap: Record<string, number> = {
      fuel_optimization: 0.85,
      camping_alternative: 0.80,
      route_optimization: 0.90,
      price_comparison: 0.75,
      timing_optimization: 0.70,
      general: 0.65
    };
    return confidenceMap[recommendationType] || 0.70;
  }

  private async getTotalPamSavings(userId: string): Promise<number> {
    try {
      // Mock implementation - would query actual PAM savings records
      return 150.50; // Example total savings
    } catch {
      return 0;
    }
  }

  private async getPamSavingsAnalysis(userId: string, period: string): Promise<PamSavingsAttribution> {
    try {
      // Mock implementation - would analyze actual PAM attribution data
      return {
        totalSavings: 150.50,
        savingsBreakdown: {
          fuel_optimization: 75.25,
          camping_alternative: 45.00,
          route_optimization: 30.25
        },
        recommendationImpact: [
          {
            type: 'fuel_optimization',
            amount: 25.50,
            confidence: 0.85,
            date: new Date().toISOString().split('T')[0]
          }
        ],
        roi: 3.2 // $3.20 saved per $1 spent on PAM
      };
    } catch {
      return { totalSavings: 0, savingsBreakdown: {}, recommendationImpact: [], roi: 0 };
    }
  }

  // ============================================================================
  // ADVANCED ANALYTICS METHODS
  // ============================================================================

  private async performAdvancedAnalysis(expenses: any[], period: string): Promise<ExpenseAnalysis> {
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const daysInPeriod = this.getDaysInPeriod(period);
    const averageDaily = totalSpent / daysInPeriod;

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach(expense => {
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
    });

    // Spending trend analysis
    const spendingTrend = this.calculateSpendingTrend(expenses);
    
    // Seasonality analysis
    const seasonality = this.analyzeSeasonality(expenses);
    
    // Predictive monthly spending
    const predictedMonthly = this.predictMonthlySpending(expenses, averageDaily);

    return {
      totalSpent,
      averageDaily,
      categoryBreakdown,
      spendingTrend,
      seasonality,
      predictedMonthly
    };
  }

  private calculateSpendingTrend(expenses: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (expenses.length < 10) return 'stable';
    
    const recent = expenses.slice(0, Math.floor(expenses.length / 2));
    const earlier = expenses.slice(Math.floor(expenses.length / 2));
    
    const recentAvg = recent.reduce((sum, e) => sum + e.amount, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, e) => sum + e.amount, 0) / earlier.length;
    
    const threshold = 0.1; // 10% threshold
    if (recentAvg > earlierAvg * (1 + threshold)) return 'increasing';
    if (recentAvg < earlierAvg * (1 - threshold)) return 'decreasing';
    return 'stable';
  }

  private analyzeSeasonality(expenses: any[]): string {
    // Simple seasonality analysis based on recent patterns
    const monthlyTotals: Record<string, number> = {};
    expenses.forEach(expense => {
      const month = new Date(expense.date).getMonth();
      monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.amount;
    });
    
    const currentMonth = new Date().getMonth();
    const currentSpending = monthlyTotals[currentMonth] || 0;
    const averageSpending = Object.values(monthlyTotals).reduce((a, b) => a + b, 0) / Object.keys(monthlyTotals).length;
    
    if (currentSpending > averageSpending * 1.2) return 'high_season';
    if (currentSpending < averageSpending * 0.8) return 'low_season';
    return 'normal_season';
  }

  private predictMonthlySpending(expenses: any[], averageDaily: number): number {
    // Enhanced prediction using trend analysis
    const daysInMonth = 30;
    const trendMultiplier = 1.0; // Would be calculated based on trends
    return averageDaily * daysInMonth * trendMultiplier;
  }

  private getDaysInPeriod(period: string): number {
    const periodDays: Record<string, number> = {
      day: 1,
      week: 7,
      month: 30,
      year: 365
    };
    return periodDays[period] || 30;
  }

  // ============================================================================
  // FINANCIAL HEALTH SCORING
  // ============================================================================

  private async calculateFinancialHealthScore(userId: string, analysis: ExpenseAnalysis): Promise<FinancialHealthScore> {
    const factors = {
      spending_consistency: {
        value: analysis.spendingTrend === 'stable' ? 85 : analysis.spendingTrend === 'decreasing' ? 95 : 60,
        weight: 0.3,
        description: 'Consistency in spending patterns'
      },
      category_balance: {
        value: this.calculateCategoryBalance(analysis.categoryBreakdown),
        weight: 0.25,
        description: 'Balance across expense categories'
      },
      savings_rate: {
        value: await this.calculateSavingsRate(userId),
        weight: 0.25,
        description: 'Rate of savings accumulation'
      },
      pam_impact: {
        value: await this.calculatePamImpactScore(userId),
        weight: 0.2,
        description: 'Effectiveness of PAM recommendations'
      }
    };

    // Calculate weighted score
    const score = Object.values(factors).reduce((total, factor) => {
      return total + (factor.value * factor.weight);
    }, 0);

    const recommendations = this.generateHealthRecommendations(factors);
    
    return {
      score: Math.round(score),
      factors,
      recommendations,
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }

  private calculateCategoryBalance(categoryBreakdown: Record<string, number>): number {
    const total = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0);
    if (total === 0) return 70;
    
    // Ideal distribution for RV travel
    const idealDistribution = {
      fuel: 0.30,
      food: 0.20,
      camping: 0.25,
      maintenance: 0.10,
      entertainment: 0.10,
      supplies: 0.05
    };
    
    let balanceScore = 100;
    Object.entries(idealDistribution).forEach(([category, ideal]) => {
      const actual = (categoryBreakdown[category] || 0) / total;
      const deviation = Math.abs(actual - ideal);
      balanceScore -= deviation * 50; // Penalty for deviation
    });
    
    return Math.max(40, Math.min(100, balanceScore));
  }

  private async calculateSavingsRate(userId: string): Promise<number> {
    // Mock implementation - would calculate actual savings rate
    return 75; // Example: 75% savings rate score
  }

  private async calculatePamImpactScore(userId: string): Promise<number> {
    const pamSavings = await this.getTotalPamSavings(userId);
    // Score based on PAM's financial impact
    if (pamSavings > 200) return 95;
    if (pamSavings > 100) return 85;
    if (pamSavings > 50) return 75;
    if (pamSavings > 0) return 65;
    return 50;
  }

  private generateHealthRecommendations(factors: any): string[] {
    const recommendations: string[] = [];
    
    Object.entries(factors).forEach(([key, factor]: [string, any]) => {
      if (factor.value < 70) {
        switch (key) {
          case 'spending_consistency':
            recommendations.push('Consider establishing a more consistent spending routine');
            break;
          case 'category_balance':
            recommendations.push('Review your expense categories for better balance');
            break;
          case 'savings_rate':
            recommendations.push('Explore opportunities to increase your savings rate');
            break;
          case 'pam_impact':
            recommendations.push('Engage more with PAM recommendations to increase savings');
            break;
        }
      }
    });
    
    return recommendations;
  }

  // ============================================================================
  // BUDGET RECOMMENDATIONS
  // ============================================================================

  private async generateSmartBudgetRecommendations(
    userId: string, 
    analysis: ExpenseAnalysis,
    pamSavings: PamSavingsAttribution
  ): Promise<SmartBudgetRecommendation[]> {
    const recommendations: SmartBudgetRecommendation[] = [];
    
    Object.entries(analysis.categoryBreakdown).forEach(([category, amount]) => {
      const suggestion = this.generateCategoryBudgetSuggestion(category, amount, analysis.totalSpent, pamSavings);
      if (suggestion) {
        recommendations.push(suggestion);
      }
    });
    
    return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  private generateCategoryBudgetSuggestion(
    category: string, 
    currentAmount: number, 
    totalSpent: number, 
    pamSavings: PamSavingsAttribution
  ): SmartBudgetRecommendation | null {
    const percentage = currentAmount / totalSpent;
    
    // RV-specific budget optimization
    const optimizationRules = {
      fuel: { maxPercentage: 0.35, tips: 'Route optimization and fuel-efficient driving' },
      food: { maxPercentage: 0.25, tips: 'Meal planning and RV cooking' },
      camping: { maxPercentage: 0.30, tips: 'Advance booking and alternative sites' },
      maintenance: { maxPercentage: 0.15, tips: 'Preventive maintenance and DIY repairs' },
      entertainment: { maxPercentage: 0.15, tips: 'Free activities and nature experiences' }
    };
    
    const rule = optimizationRules[category as keyof typeof optimizationRules];
    if (!rule) return null;
    
    if (percentage > rule.maxPercentage) {
      const suggestedAmount = totalSpent * rule.maxPercentage;
      const potentialSavings = currentAmount - suggestedAmount;
      
      return {
        category,
        currentBudget: currentAmount,
        suggestedBudget: suggestedAmount,
        reasoning: rule.tips,
        potentialSavings,
        confidence: 0.8
      };
    }
    
    return null;
  }

  // ============================================================================
  // INSIGHTS GENERATION
  // ============================================================================

  private async generateExpenseInsights(userId: string, expense: any): Promise<string[]> {
    const insights: string[] = [];
    
    // Category-specific insights
    if (expense.category === 'fuel') {
      insights.push('Consider using GasBuddy to find cheaper fuel prices');
    } else if (expense.category === 'food' && expense.amount > 30) {
      insights.push('Cooking in your RV could save 40-60% on food costs');
    } else if (expense.category === 'camping' && expense.amount > 50) {
      insights.push('Look for state parks - they\'re often cheaper than private campgrounds');
    }
    
    return insights.slice(0, 2);
  }

  private generatePostExpenseSuggestions(expense: any): string[] {
    const suggestions = [
      'View category trends',
      'Set spending alerts',
      'Compare to budget',
      'Get optimization tips'
    ];
    
    // Category-specific suggestions
    if (expense.category === 'fuel') {
      suggestions.unshift('Find nearby cheaper fuel');
    } else if (expense.category === 'food') {
      suggestions.unshift('Plan RV meals');
    }
    
    return suggestions.slice(0, 3);
  }

  private async generateContextualInsights(
    userId: string,
    recentExpenses: any[],
    pamImpact: PamSavingsAttribution,
    context: any
  ): Promise<any> {
    const insights = {
      general: [] as string[],
      savingsPotential: '$0',
      confidence: 0.8
    };
    
    // Analyze recent spending patterns
    if (recentExpenses.length > 0) {
      const avgExpense = recentExpenses.reduce((sum, e) => sum + e.amount, 0) / recentExpenses.length;
      insights.general.push(`Your average expense is $${avgExpense.toFixed(2)}`);
    }
    
    // PAM-specific insights
    if (pamImpact.totalSavings > 0) {
      insights.general.push(`PAM has helped you save $${pamImpact.totalSavings.toFixed(2)} through smart recommendations`);
      insights.confidence += 0.1;
    }
    
    // Travel context insights
    if (context?.isOnTrip) {
      insights.general.push('Travel mode detected - monitoring for trip-specific savings opportunities');
    }
    
    // Calculate savings potential
    const monthlySavingsPotential = Math.max(50, pamImpact.totalSavings * 2);
    insights.savingsPotential = `$${monthlySavingsPotential.toFixed(0)}/month`;
    
    return insights;
  }

  private async generatePredictiveInsights(userId: string, expenses: any[]): Promise<any> {
    if (expenses.length < 5) {
      return { nextMonth: 0, confidence: 0.5 };
    }
    
    const recentMonthExpenses = expenses.slice(0, 30);
    const total = recentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const dailyAverage = total / Math.min(30, recentMonthExpenses.length);
    
    return {
      nextMonth: dailyAverage * 30,
      confidence: 0.75,
      trend: total > 1000 ? 'increasing' : 'stable'
    };
  }

  private async generateSmartRecommendations(
    userId: string,
    insights: any,
    predictions: any,
    pamImpact: PamSavingsAttribution
  ): Promise<string[]> {
    const recommendations = [
      'Set up automatic expense categorization',
      'Consider PAM\'s fuel optimization suggestions',
      'Plan meals in advance to reduce food costs'
    ];
    
    if (predictions.nextMonth > 2000) {
      recommendations.unshift('Your predicted spending is high - consider budget adjustments');
    }
    
    if (pamImpact.totalSavings < 50) {
      recommendations.push('Engage more with PAM recommendations to increase savings');
    }
    
    return recommendations.slice(0, 4);
  }

  private async generateTravelSpecificTips(userId: string, expenses: any[], context: any): Promise<string[]> {
    const tips = [
      '🏕️ Book campgrounds 2-3 days in advance for better rates',
      '⛽ Use apps like GasBuddy for fuel savings',
      '🍳 Cooking in your RV saves 50-70% on food costs',
      '🗺️ Plan routes to avoid toll roads and save money'
    ];
    
    // Contextual tips based on location or recent expenses
    const hasRecentFuelExpenses = expenses.some(e => e.category === 'fuel' && this.isRecent(e.date));
    if (hasRecentFuelExpenses) {
      tips.unshift('⛽ Consider fuel rewards programs for additional savings');
    }
    
    return tips.slice(0, 3);
  }

  private generateActionableInsights(analysis: ExpenseAnalysis, pamSavings: PamSavingsAttribution): string[] {
    const insights: string[] = [];
    
    if (analysis.spendingTrend === 'increasing') {
      insights.push('Consider implementing spending controls - trend is increasing');
    }
    
    if (pamSavings.totalSavings > 100) {
      insights.push(`PAM is delivering great value - $${pamSavings.totalSavings.toFixed(2)} in savings!`);
    }
    
    // Category-specific insights
    const topCategory = Object.entries(analysis.categoryBreakdown)
      .sort(([, a], [, b]) => b - a)[0];
      
    if (topCategory) {
      insights.push(`${topCategory[0]} is your largest expense category at $${topCategory[1].toFixed(2)}`);
    }
    
    return insights.slice(0, 3);
  }

  private generateNextSteps(healthScore: FinancialHealthScore, budgetRecommendations: SmartBudgetRecommendation[]): string[] {
    const steps: string[] = [];
    
    if (healthScore.score < 70) {
      steps.push('Focus on improving financial health score');
    }
    
    if (budgetRecommendations.length > 0) {
      const topRecommendation = budgetRecommendations[0];
      steps.push(`Optimize ${topRecommendation.category} spending - potential savings: $${topRecommendation.potentialSavings.toFixed(2)}`);
    }
    
    steps.push('Continue tracking expenses with PAM');
    steps.push('Review progress weekly');
    
    return steps.slice(0, 3);
  }

  private prioritizeActionItems(recommendations: string[]): string[] {
    // Sort recommendations by potential impact
    const priorityKeywords = ['high', 'save', 'reduce', 'optimize'];
    
    return recommendations.sort((a, b) => {
      const aScore = priorityKeywords.reduce((score, keyword) => {
        return score + (a.toLowerCase().includes(keyword) ? 1 : 0);
      }, 0);
      const bScore = priorityKeywords.reduce((score, keyword) => {
        return score + (b.toLowerCase().includes(keyword) ? 1 : 0);
      }, 0);
      return bScore - aScore;
    });
  }

  private async integrateExternalFinancialData(userId: string): Promise<any> {
    // Integration point for MCP tools - would fetch external financial data
    // This could integrate with tools like:
    // - Real-time fuel prices
    // - Campground pricing data
    // - Weather data for travel planning
    // - Regional cost-of-living data
    
    return {
      fuelPrices: { average: 3.45, trend: 'stable' },
      campgroundAvgCost: { region: 'current', average: 35 },
      weatherImpact: 'favorable for travel'
    };
  }

  private generateFallbackInsights(userId: string): any {
    return {
      insights: ['I can help you track expenses and manage your RV travel budget'],
      pamImpact: { totalSavings: 0 },
      predictions: { nextMonth: 0 },
      recommendations: ['Start tracking expenses regularly', 'Engage with PAM recommendations'],
      travelTips: ['Plan your routes for fuel efficiency', 'Look for free camping opportunities'],
      savingsPotential: '$50-100/month',
      confidenceScore: 0.6
    };
  }

  // ============================================================================
  // SAVINGS INTELLIGENCE METHODS
  // ============================================================================

  private async calculatePamSavingsContribution(userId: string, goalName: string): Promise<number> {
    // Mock implementation - would calculate PAM's contribution to specific savings goal
    return 45.50; // Example PAM contribution
  }

  private async generateSavingsRecommendations(userId: string, goal: any, pamContribution: number): Promise<string[]> {
    const recommendations = [];
    
    const progress = (goal.current_amount / goal.target_amount) * 100;
    
    if (progress < 25) {
      recommendations.push('Consider automating your savings with weekly transfers');
    } else if (progress < 75) {
      recommendations.push('You\'re making good progress - stay consistent!');
    }
    
    if (pamContribution > 0) {
      recommendations.push(`PAM is contributing $${pamContribution.toFixed(2)} - keep following recommendations!`);
    } else {
      recommendations.push('Engage with PAM recommendations to accelerate your savings');
    }
    
    return recommendations.slice(0, 3);
  }

  private expectedProgressForGoal(goal: any): number {
    // Calculate expected progress based on goal timeline
    const createdDate = new Date(goal.created_at || goal.updated_at);
    const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Assume 6-month goal timeline as default
    const expectedDays = 180;
    const expectedProgress = Math.min(100, (daysSinceCreated / expectedDays) * 100);
    
    return expectedProgress;
  }

  private calculateProjectedCompletion(goal: any, pamContribution: number): string {
    const remaining = goal.target_amount - goal.current_amount;
    const monthlyRate = pamContribution + 50; // Assume $50/month base savings
    
    if (monthlyRate <= 0) return 'Unable to project';
    
    const monthsToCompletion = Math.ceil(remaining / monthlyRate);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsToCompletion);
    
    return completionDate.toISOString().split('T')[0];
  }

  private generateOptimizationTips(goal: any, recommendations: string[]): string[] {
    const tips = [
      'Set up automatic transfers to accelerate progress',
      'Use PAM recommendations to find additional savings',
      'Review and adjust your goal timeline if needed'
    ];
    
    const progress = (goal.current_amount / goal.target_amount) * 100;
    if (progress < 50) {
      tips.unshift('Consider breaking down your goal into smaller milestones');
    }
    
    return tips.slice(0, 3);
  }

  private async analyzeSavingsGoals(userId: string): Promise<any> {
    // Mock implementation - would analyze all user savings goals
    return {
      totalGoals: 3,
      activeGoals: 2,
      completedGoals: 1,
      totalProgress: '67%',
      pamContribution: 125.75,
      nextMilestone: 'Emergency Fund - $300 remaining'
    };
  }

  private async analyzePamFinancialImpact(userId: string): Promise<PamSavingsAttribution> {
    return this.getPamSavingsAnalysis(userId, 'month');
  }

  private calculateNextCheckInDate(): string {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  private isRecent(dateString: string): boolean {
    const date = new Date(dateString);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date > weekAgo;
  }

  // ============================================================================
  // EXISTING HELPER METHODS (ENHANCED)
  // ============================================================================

  private extractAmount(message: string): number | null {
    // Enhanced amount extraction with more patterns
    const patterns = [
      /\$(\d+(?:\.\d{2})?)/,           // $123.45
      /(\d+(?:\.\d{2})?)\s*dollars?/i,  // 123.45 dollars
      /(\d+(?:\.\d{2})?)\s*bucks?/i,    // 123 bucks
      /spent\s+(\d+(?:\.\d{2})?)/i,     // spent 123.45
      /cost\s+(\d+(?:\.\d{2})?)/i,      // cost 123.45
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    
    return null;
  }

  private extractCategory(message: string): string {
    // Enhanced category extraction with RV-specific categories
    const categories = {
      fuel: ['fuel', 'gas', 'gasoline', 'diesel', 'petrol', 'station', 'pump', 'fill'],
      food: ['food', 'meal', 'eat', 'restaurant', 'grocery', 'lunch', 'dinner', 'breakfast'],
      camping: ['camp', 'campground', 'rv park', 'park', 'site', 'hookup', 'overnight'],
      maintenance: ['repair', 'maintenance', 'service', 'oil', 'tire', 'brake', 'mechanic'],
      entertainment: ['entertainment', 'attraction', 'tour', 'museum', 'ticket', 'show'],
      supplies: ['supplies', 'equipment', 'gear', 'hardware', 'tools'],
      tolls: ['toll', 'bridge', 'turnpike', 'highway'],
      insurance: ['insurance', 'policy', 'premium', 'coverage'],
      communication: ['phone', 'internet', 'wifi', 'cellular', 'data']
    };
    
    const lowerMessage = message.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  }

  private extractTimeframe(message: string): string {
    const timePatterns = {
      day: /today|daily|this\s+day/i,
      week: /this\s+week|weekly|past\s+week|last\s+week/i,
      month: /this\s+month|monthly|past\s+month|last\s+month/i,
      quarter: /quarter|quarterly|past\s+3\s+months/i,
      year: /this\s+year|yearly|annual|past\s+year|last\s+year/i
    };
    
    for (const [timeframe, pattern] of Object.entries(timePatterns)) {
      if (pattern.test(message)) {
        return timeframe;
      }
    }
    
    return 'month'; // default
  }

  private getPeriodStartDate(period: string): string {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }
    
    return startDate.toISOString();
  }
}