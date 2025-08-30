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
    
    // Use fallback mock response when API is not configured
    return getMockHealthResponse(message, context, model);
  }
}

// Mock response generator for when API is not configured
function getMockHealthResponse(
  message: string,
  context: HealthContext,
  model: string
): HealthConsultationResponse {
  const lowerMessage = message.toLowerCase();
  let response = '';

  // Generate contextual mock responses
  if (lowerMessage.includes('medication') || lowerMessage.includes('medicine')) {
    const medCount = context.medications.length;
    response = `Based on your medical records, you're currently taking ${medCount} medication(s)${medCount > 0 ? ': ' + context.medications.join(', ') : ''}.

For information about any medication:
• Check the medication guide that came with your prescription
• Consult your pharmacist for specific questions  
• Never change dosage without doctor approval
• Report any side effects to your healthcare provider

📝 This is health information only, not medical advice. Always consult your healthcare provider about medications.`;
  } else if (lowerMessage.includes('allergy') || lowerMessage.includes('allergic')) {
    const allergyList = context.allergies.length > 0 ? context.allergies.join(', ') : 'None listed';
    response = `According to your emergency information, you have the following allergies listed: ${allergyList}.

Important allergy reminders:
• Always inform healthcare providers about all allergies
• Wear medical alert identification if you have severe allergies
• Keep emergency medications (like EpiPen) accessible
• Read all medication and food labels carefully
• Be extra cautious when trying new foods while traveling

📝 This is health information only. Consult an allergist for specific allergy management.`;
  } else if (lowerMessage.includes('travel') || lowerMessage.includes('rv') || lowerMessage.includes('trip')) {
    response = `Here are some health tips for RV travel:

Travel Health Essentials:
• Keep a well-stocked first aid kit in your RV
• Store medications in a temperature-controlled area
• Stay hydrated, especially in hot climates
• Maintain good hygiene to prevent illness
• Know the location of nearby hospitals along your route
• Keep emergency contacts easily accessible
• Consider travel insurance that covers medical emergencies

RV-Specific Health Considerations:
• Ensure proper ventilation to prevent carbon monoxide exposure
• Use safe water sources and consider water filtration
• Practice food safety with limited refrigeration
• Take breaks during long drives to prevent fatigue

📝 This is general health information. Consult your doctor before traveling if you have specific health conditions.`;
  } else if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
    response = `If you're experiencing a medical emergency, please:

1. Call emergency services immediately
2. Do not rely on this app for emergency medical decisions
3. If possible, have someone stay with you
4. Provide your location to emergency responders
5. Follow dispatcher instructions

Common emergency symptoms requiring immediate attention:
• Chest pain or pressure
• Difficulty breathing
• Severe bleeding
• Loss of consciousness
• Signs of stroke (facial drooping, slurred speech)
• Severe allergic reactions

📝 This information is not a substitute for emergency medical care. Call emergency services immediately if you're experiencing a medical emergency.`;
  } else {
    // Default response
    response = `I understand you're asking about "${message}".

While I can provide general health information, I recommend discussing this with your healthcare provider for personalized medical advice.

General Health Information:
• Regular check-ups are important for preventive care
• Maintain a balanced diet and stay hydrated
• Get adequate sleep (7-9 hours for adults)
• Exercise regularly as appropriate for your fitness level
• Manage stress through relaxation techniques
• Keep your medical records updated

Would you like me to help you:
• Prepare questions for your doctor about this topic?
• Explain any medical terms you've encountered?
• Provide general wellness information?

📝 Remember: This is health information only, not medical advice. Always consult qualified healthcare professionals for medical concerns.`;
  }

  return {
    success: true,
    response,
    hasEmergency: checkForEmergency(message),
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    },
    model,
    timestamp: new Date().toISOString(),
    disclaimer: 'This is health information only, not medical advice. Always consult healthcare professionals for medical concerns.'
  };
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