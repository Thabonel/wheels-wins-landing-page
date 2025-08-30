/**
 * Health Consultation Client Service
 * Connects to the Netlify function for AI health consultations
 */

import { supabase } from '@/integrations/supabase/client';
import type { MedicalMedication, MedicalEmergencyInfo } from '@/types/medical';

// API endpoint (will be proxied through Netlify)
const HEALTH_API_ENDPOINT = '/.netlify/functions/health-consultation';

// Response types
export interface HealthConsultationResponse {
  success: boolean;
  response: string;
  hasEmergency: boolean;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  timestamp: string;
  disclaimer: string;
  error?: string;
}

export interface HealthContext {
  medications: string[];
  allergies: string[];
  conditions: string[];
}

// Build health context from user's medical data
export async function buildHealthContext(userId: string): Promise<HealthContext> {
  try {
    // Fetch user's medical data
    const [medicationsResult, emergencyInfoResult] = await Promise.all([
      supabase
        .from('medical_medications')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true),
      supabase
        .from('medical_emergency_info')
        .select('*')
        .eq('user_id', userId)
        .single()
    ]);

    const medications = (medicationsResult.data as MedicalMedication[] || [])
      .map(m => m.name);
    
    const emergencyInfo = emergencyInfoResult.data as MedicalEmergencyInfo | null;

    return {
      medications,
      allergies: emergencyInfo?.allergies || [],
      conditions: emergencyInfo?.medical_conditions || []
    };
  } catch (error) {
    console.error('Error building health context:', error);
    return {
      medications: [],
      allergies: [],
      conditions: []
    };
  }
}

// Send health consultation request
export async function sendHealthConsultation(
  message: string,
  context: HealthContext,
  options: {
    model?: 'fast' | 'accurate' | 'balanced';
    disclaimerAccepted?: boolean;
  } = {}
): Promise<HealthConsultationResponse> {
  const {
    model = 'balanced',
    disclaimerAccepted = true
  } = options;

  try {
    const response = await fetch(HEALTH_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        model,
        disclaimerAccepted
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as HealthConsultationResponse;
  } catch (error) {
    console.error('Health consultation error:', error);
    
    // Return error response
    return {
      success: false,
      response: 'I apologize, but I\'m unable to process your health question at the moment. For urgent medical concerns, please contact your healthcare provider or call 911.',
      hasEmergency: false,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      model,
      timestamp: new Date().toISOString(),
      disclaimer: 'This service provides health information only. Always consult healthcare professionals for medical advice.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Check if message contains emergency keywords
export function checkForEmergency(message: string): boolean {
  const emergencyKeywords = [
    'chest pain', 'can\'t breathe', 'bleeding heavily',
    'unconscious', 'stroke', 'heart attack', 'severe pain',
    'emergency', 'urgent', '911', 'severe allergic',
    'suicidal', 'poisoning', 'overdose'
  ];
  
  const lowerMessage = message.toLowerCase();
  return emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Format consultation for display
export function formatHealthResponse(response: string): string {
  // Ensure response has proper line breaks for readability
  return response
    .replace(/\n\n/g, '\n\n')
    .replace(/•/g, '\n•')
    .trim();
}

// Save consultation to history (optional)
export async function saveConsultationToHistory(
  userId: string,
  question: string,
  response: string,
  hasEmergency: boolean = false
): Promise<void> {
  try {
    // This would save to a consultation history table if it exists
    // For now, we can store in local storage as backup
    const history = JSON.parse(localStorage.getItem('health_consultations') || '[]');
    history.push({
      userId,
      question,
      response,
      hasEmergency,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 consultations
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    localStorage.setItem('health_consultations', JSON.stringify(history));
  } catch (error) {
    console.error('Error saving consultation to history:', error);
    // Non-critical error, don't throw
  }
}

// Get consultation history from local storage
export function getConsultationHistory(userId: string): Array<{
  question: string;
  response: string;
  hasEmergency: boolean;
  timestamp: string;
}> {
  try {
    const history = JSON.parse(localStorage.getItem('health_consultations') || '[]');
    return history
      .filter((item: any) => item.userId === userId)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Error getting consultation history:', error);
    return [];
  }
}

// Clear consultation history
export function clearConsultationHistory(userId: string): void {
  try {
    const history = JSON.parse(localStorage.getItem('health_consultations') || '[]');
    const filtered = history.filter((item: any) => item.userId !== userId);
    localStorage.setItem('health_consultations', JSON.stringify(filtered));
  } catch (error) {
    console.error('Error clearing consultation history:', error);
  }
}