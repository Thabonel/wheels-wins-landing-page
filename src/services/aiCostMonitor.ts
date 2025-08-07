/**
 * AI Cost Monitoring Service
 * Tracks API usage and costs with alerts and circuit breakers
 */

import * as Sentry from '@sentry/react';
import { flags } from '@/config/featureFlags';

interface CostEntry {
  timestamp: Date;
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  requestId: string;
  userId?: string;
}

interface UsageStats {
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  averageCostPerRequest: number;
  modelUsage: Record<string, {
    requests: number;
    cost: number;
    tokens: number;
  }>;
}

class AiCostMonitor {
  private entries: CostEntry[] = [];
  private dailyBudget: number = flags.maxDailyCost;
  private alertThresholds = {
    warning: 0.7,  // 70% of budget
    critical: 0.9, // 90% of budget
  };
  
  private modelCosts = {
    'gpt-4-turbo-preview': {
      input: 0.01,   // per 1K tokens
      output: 0.03,
    },
    'gpt-3.5-turbo': {
      input: 0.0015,
      output: 0.002,
    },
    'claude-3-sonnet-20240229': {
      input: 0.003,
      output: 0.015,
    },
    'claude-3-haiku-20240307': {
      input: 0.00025,
      output: 0.00125,
    },
  };

  /**
   * Track a completed API request
   */
  trackUsage(params: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    requestId: string;
    userId?: string;
  }): CostEntry {
    const { model, inputTokens, outputTokens, requestId, userId } = params;
    
    const modelCost = this.modelCosts[model as keyof typeof this.modelCosts];
    if (!modelCost) {
      console.warn(`Unknown model for cost calculation: ${model}`);
      Sentry.addBreadcrumb({
        message: 'Unknown model cost',
        data: { model },
        level: 'warning',
      });
    }

    const inputCost = (inputTokens / 1000) * (modelCost?.input || 0.01);
    const outputCost = (outputTokens / 1000) * (modelCost?.output || 0.03);
    const totalCost = inputCost + outputCost;

    const entry: CostEntry = {
      timestamp: new Date(),
      model,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      cost: totalCost,
      requestId,
      userId,
    };

    this.entries.push(entry);
    this.cleanupOldEntries();
    this.checkBudgetAlerts();

    // Log to Sentry for monitoring
    Sentry.addBreadcrumb({
      message: 'AI API Usage',
      data: {
        model,
        tokens: entry.tokens.total,
        cost: totalCost,
        requestId,
      },
      level: 'info',
    });

    return entry;
  }

  /**
   * Get current day's usage statistics
   */
  getDailyStats(): UsageStats {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEntries = this.entries.filter(entry => 
      entry.timestamp >= today
    );

    const stats: UsageStats = {
      totalCost: 0,
      totalTokens: 0,
      requestCount: todayEntries.length,
      averageCostPerRequest: 0,
      modelUsage: {},
    };

    todayEntries.forEach(entry => {
      stats.totalCost += entry.cost;
      stats.totalTokens += entry.tokens.total;
      
      if (!stats.modelUsage[entry.model]) {
        stats.modelUsage[entry.model] = {
          requests: 0,
          cost: 0,
          tokens: 0,
        };
      }
      
      stats.modelUsage[entry.model].requests++;
      stats.modelUsage[entry.model].cost += entry.cost;
      stats.modelUsage[entry.model].tokens += entry.tokens.total;
    });

    stats.averageCostPerRequest = stats.requestCount > 0 
      ? stats.totalCost / stats.requestCount 
      : 0;

    return stats;
  }

  /**
   * Check if we can make another request without exceeding budget
   */
  canMakeRequest(estimatedCost: number = 0.05): boolean {
    if (!flags.enableCostLimits) {
      return true;
    }

    const dailyStats = this.getDailyStats();
    const projectedCost = dailyStats.totalCost + estimatedCost;
    
    return projectedCost <= this.dailyBudget;
  }

  /**
   * Get remaining budget for today
   */
  getRemainingBudget(): number {
    const dailyStats = this.getDailyStats();
    return Math.max(0, this.dailyBudget - dailyStats.totalCost);
  }

  /**
   * Get budget usage percentage
   */
  getBudgetUsagePercentage(): number {
    const dailyStats = this.getDailyStats();
    return (dailyStats.totalCost / this.dailyBudget) * 100;
  }

  /**
   * Check budget and send alerts if needed
   */
  private checkBudgetAlerts(): void {
    const usagePercentage = this.getBudgetUsagePercentage() / 100;
    
    if (usagePercentage >= this.alertThresholds.critical) {
      this.sendAlert('critical', usagePercentage);
    } else if (usagePercentage >= this.alertThresholds.warning) {
      this.sendAlert('warning', usagePercentage);
    }
  }

  /**
   * Send budget alert
   */
  private sendAlert(level: 'warning' | 'critical', usagePercentage: number): void {
    const dailyStats = this.getDailyStats();
    const message = `AI API ${level}: ${(usagePercentage * 100).toFixed(1)}% of daily budget used`;
    
    console.warn(message, {
      level,
      usagePercentage,
      totalCost: dailyStats.totalCost,
      dailyBudget: this.dailyBudget,
      remainingBudget: this.getRemainingBudget(),
    });

    Sentry.captureMessage(message, level === 'critical' ? 'error' : 'warning');
    
    // In production, you might want to send email/Slack alerts here
    if (level === 'critical') {
      // Could disable AI features or switch to cheaper models
      console.error('Critical budget usage - consider implementing automatic cost controls');
    }
  }

  /**
   * Clean up entries older than 7 days
   */
  private cleanupOldEntries(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    this.entries = this.entries.filter(entry => 
      entry.timestamp >= sevenDaysAgo
    );
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(days: number = 7): CostEntry[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.entries.filter(entry => entry.timestamp >= cutoffDate);
  }

  /**
   * Reset daily statistics (for testing)
   */
  resetDailyStats(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.entries = this.entries.filter(entry => entry.timestamp < today);
  }
}

// Singleton instance
export const aiCostMonitor = new AiCostMonitor();