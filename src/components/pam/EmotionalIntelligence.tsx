/**
 * PAM Emotional Intelligence - You Node Integration
 * Surfaces emotional context and empathetic responses
 * Simple, elegant interface following Apple design principles
 */

import React, { useState, useEffect } from 'react';
import { Heart, Brain, Smile, Frown, Meh, Sun, Cloud, CloudRain } from 'lucide-react';
import { cn } from '@/lib/utils';
// TEMP: Disabled during cleanup (used deleted PamContext)
// import { usePamAssistant } from '@/hooks/pam/usePamAssistant';

interface EmotionalState {
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'stressed' | 'relaxed';
  energy: 'high' | 'medium' | 'low';
  confidence: 'confident' | 'uncertain' | 'worried';
  social: 'outgoing' | 'balanced' | 'introverted';
}

interface EmotionalInsight {
  message: string;
  suggestion: string;
  type: 'encouragement' | 'advice' | 'empathy' | 'celebration';
}

export const EmotionalIntelligence: React.FC<{
  className?: string;
  compact?: boolean;
}> = ({ className, compact = false }) => {
  // TEMP: Disabled during cleanup
  // const { ask, isReady } = usePamAssistant();
  const isReady = false;
  const ask = async () => "Emotional intelligence is temporarily unavailable during cleanup.";
  const [emotionalState, setEmotionalState] = useState<EmotionalState>({
    mood: 'neutral',
    energy: 'medium',
    confidence: 'confident',
    social: 'balanced'
  });
  const [insight, setInsight] = useState<EmotionalInsight | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get emotional insights from PAM's You Node
  const getEmotionalInsight = async (state: EmotionalState) => {
    if (!isReady) return;

    try {
      setIsAnalyzing(true);
      
      const context = `User's current emotional state: mood=${state.mood}, energy=${state.energy}, confidence=${state.confidence}, social=${state.social}. As my empathetic You Node, provide a brief supportive message and helpful suggestion.`;
      
      const response = await ask(context, {
        page: 'emotional-intelligence',
        priority: 'high'
      });

      // Parse response for insight (simplified - in production would use structured response)
      const insightType = state.mood === 'happy' || state.mood === 'excited' ? 'celebration' :
                         state.mood === 'sad' || state.mood === 'stressed' ? 'empathy' :
                         state.confidence === 'worried' ? 'encouragement' : 'advice';

      setInsight({
        message: response,
        suggestion: "Take a moment to breathe and acknowledge your feelings.",
        type: insightType
      });
    } catch (error) {
      console.error('Failed to get emotional insight:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update emotional state and get insights
  const updateEmotionalState = (updates: Partial<EmotionalState>) => {
    const newState = { ...emotionalState, ...updates };
    setEmotionalState(newState);
    getEmotionalInsight(newState);
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy': return <Smile className="text-green-500" size={20} />;
      case 'sad': return <Frown className="text-blue-500" size={20} />;
      case 'excited': return <Sun className="text-yellow-500" size={20} />;
      case 'stressed': return <CloudRain className="text-red-500" size={20} />;
      case 'relaxed': return <Cloud className="text-blue-400" size={20} />;
      default: return <Meh className="text-gray-500" size={20} />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'celebration': return 'from-yellow-100 to-orange-100 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20';
      case 'empathy': return 'from-blue-100 to-purple-100 border-blue-200 dark:from-blue-900/20 dark:to-purple-900/20';
      case 'encouragement': return 'from-green-100 to-blue-100 border-green-200 dark:from-green-900/20 dark:to-blue-900/20';
      default: return 'from-gray-100 to-gray-50 border-gray-200 dark:from-gray-900/20 dark:to-gray-800/20';
    }
  };

  if (!isReady) {
    return null; // Hide if PAM is not available
  }

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-100", className)}>
        <div className="flex items-center space-x-1">
          <Heart size={16} className="text-pink-500" />
          {getMoodIcon(emotionalState.mood)}
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Feeling {emotionalState.mood} today
        </span>
      </div>
    );
  }

  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <Heart className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">How are you feeling?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">PAM's emotional support</p>
          </div>
        </div>
      </div>

      {/* Emotional State Selectors */}
      <div className="p-4 space-y-4">
        {/* Mood */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mood</label>
          <div className="flex space-x-2 overflow-x-auto">
            {['happy', 'neutral', 'sad', 'excited', 'stressed', 'relaxed'].map((mood) => (
              <button
                key={mood}
                onClick={() => updateEmotionalState({ mood: mood as any })}
                className={cn(
                  "flex flex-col items-center space-y-1 px-3 py-2 rounded-lg border transition-colors min-w-fit",
                  emotionalState.mood === mood
                    ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-600 dark:text-blue-300"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                )}
              >
                {getMoodIcon(mood)}
                <span className="text-xs capitalize">{mood}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Energy Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Energy</label>
          <div className="flex space-x-2">
            {['low', 'medium', 'high'].map((energy) => (
              <button
                key={energy}
                onClick={() => updateEmotionalState({ energy: energy as any })}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border text-sm transition-colors capitalize",
                  emotionalState.energy === energy
                    ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/50 dark:border-green-600 dark:text-green-300"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                )}
              >
                {energy}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Emotional Insight */}
      {insight && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className={cn(
            "p-4 rounded-lg border bg-gradient-to-r",
            getInsightColor(insight.type)
          )}>
            <div className="flex items-start space-x-3">
              <Brain className="text-purple-500 mt-1 flex-shrink-0" size={18} />
              <div className="space-y-2">
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {insight.message}
                </p>
                {isAnalyzing && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>PAM is analyzing your emotions...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};