
import { PamIntent } from '@/types/pamTypes';

export class IntentClassifier {
  private static keywords = {
    onboarding: ['hello', 'hi', 'start', 'new', 'help', 'begin', 'getting started', 'first time'],
    travel_advice: ['travel', 'trip', 'route', 'destination', 'journey', 'road', 'drive', 'planning'],
    budget_help: ['budget', 'money', 'cost', 'expense', 'cheap', 'affordable', 'save', 'price'],
    local_recommendations: ['recommend', 'suggest', 'local', 'nearby', 'around here', 'area', 'best places'],
    safety_tips: ['safety', 'safe', 'secure', 'dangerous', 'risk', 'precaution', 'emergency'],
    transport_info: ['fuel', 'gas', 'petrol', 'vehicle', 'maintenance', 'repair', 'mechanic', 'parking'],
    general: []
  };

  static classifyIntent(message: string): PamIntent {
    const lowerMessage = message.toLowerCase();
    const scores: Record<string, number> = {};

    // Calculate scores for each intent
    Object.entries(this.keywords).forEach(([intent, keywords]) => {
      if (intent === 'general') return;

      scores[intent] = keywords.reduce((score: number, keyword: string) => {
        return score + (lowerMessage.includes(keyword) ? 1 : 0);
      }, 0);
    });

    // Find the intent with the highest score
    let bestIntent = 'general';
    let maxScore = 0;
    
    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intent;
      }
    }

    // If no specific intent detected or score is 0, default to appropriate intent
    if (maxScore === 0) {
      const greetingPattern = /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i;
      if (greetingPattern.test(message.trim())) {
        return { type: 'onboarding', confidence: 0.8 };
      }
      return { type: 'general', confidence: 0.5 };
    }

    // Calculate confidence based on score and message length
    const confidence = Math.min(maxScore / Math.max(lowerMessage.split(' ').length * 0.3, 1), 1);

    return {
      type: bestIntent as PamIntent['type'],
      confidence: Math.max(confidence, 0.6)
    };
  }
}
