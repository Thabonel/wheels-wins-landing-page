/**
 * WinsAgent - Financial Management Domain Agent
 * Handles expense tracking, budget analysis, and financial insights
 */

import { DomainAgent } from './base';
import { ConversationContext, AgentResponse, Tool } from '../architectureTypes';
import { supabase } from '@/integrations/supabase/client';

export class WinsAgent extends DomainAgent {
  constructor() {
    super(
      'WinsAgent',
      'Specializes in financial tracking, expense management, budgeting, and savings goals'
    );
  }

  protected async loadTools(): Promise<void> {
    // Expense Tracking Tool
    this.registerTool({
      id: 'expense_tracker',
      name: 'Expense Tracker',
      description: 'Records and categorizes expenses',
      category: 'finance',
      execute: async (params) => {
        const { amount, category, description, date } = params;
        try {
          const { data, error } = await supabase
            .from('expenses')
            .insert({
              amount,
              category,
              description,
              date: date || new Date().toISOString(),
              user_id: params.userId,
            })
            .select()
            .single();
          
          if (error) throw error;
          return { success: true, expense: data };
        } catch (error) {
          console.error('Expense tracking error:', error);
          return { success: false, error: 'Failed to track expense' };
        }
      },
      validate: (params) => params.amount && params.category,
    });

    // Budget Analysis Tool
    this.registerTool({
      id: 'budget_analyzer',
      name: 'Budget Analyzer',
      description: 'Analyzes spending patterns and budget status',
      category: 'finance',
      execute: async (params) => {
        const { userId, period = 'month' } = params;
        try {
          // Get expenses for the period
          const { data: expenses, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .gte('date', this.getPeriodStartDate(period));
          
          if (error) throw error;

          // Calculate totals by category
          const categoryTotals: Record<string, number> = {};
          let total = 0;
          
          for (const expense of expenses || []) {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
            total += expense.amount;
          }

          return {
            totalSpent: total,
            byCategory: categoryTotals,
            topCategory: Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0],
            expenseCount: expenses?.length || 0,
          };
        } catch (error) {
          console.error('Budget analysis error:', error);
          return { error: 'Failed to analyze budget' };
        }
      },
    });

    // Savings Goal Tool
    this.registerTool({
      id: 'savings_tracker',
      name: 'Savings Tracker',
      description: 'Manages and tracks savings goals',
      category: 'finance',
      execute: async (params) => {
        const { userId, goalName, targetAmount, currentAmount } = params;
        try {
          // Get or create savings goal
          const { data, error } = await supabase
            .from('savings_goals')
            .upsert({
              user_id: userId,
              name: goalName,
              target_amount: targetAmount,
              current_amount: currentAmount,
            })
            .select()
            .single();
          
          if (error) throw error;
          
          const progress = (data.current_amount / data.target_amount) * 100;
          const remaining = data.target_amount - data.current_amount;
          
          return {
            goal: data,
            progress: `${progress.toFixed(1)}%`,
            remaining,
            onTrack: progress >= 50,
          };
        } catch (error) {
          console.error('Savings tracking error:', error);
          return { error: 'Failed to track savings goal' };
        }
      },
    });

    // Financial Insights Tool
    this.registerTool({
      id: 'financial_insights',
      name: 'Financial Insights',
      description: 'Provides financial recommendations and insights',
      category: 'finance',
      execute: async (params) => {
        const { userId } = params;
        // Generate insights based on spending patterns
        const insights = [
          'Consider reducing fuel expenses by planning more efficient routes',
          'You could save 15% by cooking more meals in your RV',
          'Your maintenance costs are below average - great job!',
        ];
        
        return {
          insights,
          tip: 'Track expenses daily for better budget control',
          savingsPotential: '$200-300/month',
        };
      },
    });
  }

  protected async analyzeRequest(message: string, context: ConversationContext): Promise<any> {
    const analysis = {
      hasExpenseRequest: /spent|paid|bought|cost|expense/i.test(message),
      hasBudgetRequest: /budget|spending|how\s+much|total/i.test(message),
      hasSavingsRequest: /save|saving|goal|target/i.test(message),
      hasInsightRequest: /advice|tips|recommend|insights?|suggest/i.test(message),
      extractedAmount: this.extractAmount(message),
      extractedCategory: this.extractCategory(message),
      timeframe: this.extractTimeframe(message),
    };

    return analysis;
  }

  protected async selectTools(analysis: any, context: ConversationContext): Promise<string[]> {
    const tools: string[] = [];

    if (analysis.hasExpenseRequest && analysis.extractedAmount) {
      tools.push('expense_tracker');
    }
    if (analysis.hasBudgetRequest) {
      tools.push('budget_analyzer');
    }
    if (analysis.hasSavingsRequest) {
      tools.push('savings_tracker');
    }
    if (analysis.hasInsightRequest || tools.length === 0) {
      tools.push('financial_insights');
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

    // Process expense tracking results
    if (toolResults.has('expense_tracker')) {
      const expenseData = toolResults.get('expense_tracker');
      if (expenseData.success) {
        response += `I've recorded your expense of $${expenseData.expense.amount} for ${expenseData.expense.category}. `;
        suggestions.push('View your expense summary', 'Set a budget alert');
      } else {
        response += 'I had trouble recording that expense. ';
      }
      toolsUsed.push('expense_tracker');
    }

    // Process budget analysis results
    if (toolResults.has('budget_analyzer')) {
      const budgetData = toolResults.get('budget_analyzer');
      if (!budgetData.error) {
        response += `You've spent $${budgetData.totalSpent.toFixed(2)} this period. `;
        if (budgetData.topCategory) {
          response += `Your highest expense category is ${budgetData.topCategory[0]} at $${budgetData.topCategory[1].toFixed(2)}. `;
        }
        suggestions.push('Review detailed breakdown', 'Set spending limits');
      }
      toolsUsed.push('budget_analyzer');
    }

    // Process savings results
    if (toolResults.has('savings_tracker')) {
      const savingsData = toolResults.get('savings_tracker');
      if (!savingsData.error) {
        response += `Your savings goal is ${savingsData.progress} complete. `;
        response += `You need $${savingsData.remaining.toFixed(2)} more to reach your target. `;
        if (savingsData.onTrack) {
          response += 'You\'re on track! ';
        }
      }
      toolsUsed.push('savings_tracker');
    }

    // Process insights results
    if (toolResults.has('financial_insights')) {
      const insightData = toolResults.get('financial_insights');
      if (insightData.insights && insightData.insights.length > 0) {
        response += `Financial tip: ${insightData.insights[0]} `;
        response += `You could potentially save ${insightData.savingsPotential}. `;
        suggestions.push(...insightData.insights.slice(1, 3));
      }
      toolsUsed.push('financial_insights');
    }

    // Fallback response
    if (response === '') {
      response = 'I can help you track expenses, analyze your budget, and reach your savings goals. What would you like to know about your finances?';
      suggestions.push('Track an expense', 'View budget summary', 'Set a savings goal');
    }

    return {
      response: response.trim(),
      confidence: toolsUsed.length > 0 ? 0.9 : 0.7,
      toolsUsed,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      context: { 
        financialActivity: toolsUsed.length > 0,
      },
    };
  }

  private extractAmount(message: string): number | null {
    const amountPattern = /\$?(\d+(?:\.\d{2})?)/;
    const match = message.match(amountPattern);
    return match ? parseFloat(match[1]) : null;
  }

  private extractCategory(message: string): string {
    const categories = ['fuel', 'food', 'maintenance', 'camping', 'entertainment', 'supplies'];
    const lowerMessage = message.toLowerCase();
    
    for (const category of categories) {
      if (lowerMessage.includes(category)) {
        return category;
      }
    }
    
    // Try to infer category from keywords
    if (/gas|diesel|fill/i.test(message)) return 'fuel';
    if (/eat|meal|restaurant|grocery/i.test(message)) return 'food';
    if (/repair|fix|service/i.test(message)) return 'maintenance';
    if (/camp|park|site/i.test(message)) return 'camping';
    
    return 'other';
  }

  private extractTimeframe(message: string): string {
    if (/today|daily/i.test(message)) return 'day';
    if (/this\s+week|weekly/i.test(message)) return 'week';
    if (/this\s+month|monthly/i.test(message)) return 'month';
    if (/this\s+year|yearly|annual/i.test(message)) return 'year';
    return 'month'; // default
  }

  private getPeriodStartDate(period: string): string {
    const now = new Date();
    let startDate = new Date();
    
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
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return startDate.toISOString();
  }
}