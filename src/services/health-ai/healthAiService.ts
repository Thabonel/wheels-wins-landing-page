/**
 * Health AI Service
 * Provides AI-powered health consultation using Vercel AI SDK
 * WITH MEDICAL DISCLAIMERS - Information only, not medical advice
 */

import { streamText, CoreMessage, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { MedicalRecord, MedicalMedication, MedicalEmergencyInfo } from '@/types/medical';

// Health consultation system prompt with strong disclaimers
const HEALTH_SYSTEM_PROMPT = `You are a health information assistant for Wheels & Wins users.

CRITICAL DISCLAIMERS:
1. You provide INFORMATION ONLY - never medical advice, diagnosis, or treatment recommendations
2. ALWAYS recommend consulting qualified healthcare professionals for medical concerns
3. NEVER suggest specific medications or dosages
4. IMMEDIATELY identify potential emergencies and urge seeking immediate medical attention
5. Clearly state "This is not medical advice" in every response

Your role is to:
- Explain medical terms in simple language
- Provide general health information
- Help users prepare questions for doctor visits
- Explain what test results might mean (without diagnosing)
- Provide general wellness tips for RV travelers
- Identify when professional medical help is needed

For any serious symptoms, immediately recommend seeking professional medical care.

Remember: You are an information resource, not a healthcare provider.`;

// Emergency symptoms that require immediate attention
const EMERGENCY_SYMPTOMS = [
  'chest pain',
  'difficulty breathing',
  'severe bleeding',
  'unconscious',
  'stroke symptoms',
  'heart attack',
  'severe allergic reaction',
  'suicidal thoughts',
  'severe head injury',
  'poisoning',
  'overdose'
];

// Health consultation tools
export const healthConsultationTools = {
  checkEmergency: tool({
    description: 'Check if symptoms require emergency medical attention',
    parameters: z.object({
      symptoms: z.array(z.string()).describe('List of symptoms'),
      severity: z.enum(['mild', 'moderate', 'severe']).optional()
    }),
    execute: async ({ symptoms, severity }) => {
      const lowerSymptoms = symptoms.map(s => s.toLowerCase());
      const hasEmergency = EMERGENCY_SYMPTOMS.some(emergency => 
        lowerSymptoms.some(symptom => symptom.includes(emergency))
      );

      if (hasEmergency || severity === 'severe') {
        return {
          emergency: true,
          action: 'SEEK IMMEDIATE MEDICAL ATTENTION',
          message: 'Call 911 or go to the nearest emergency room immediately',
          symptoms
        };
      }

      return {
        emergency: false,
        action: 'Monitor symptoms',
        message: 'Consider scheduling a doctor appointment if symptoms persist or worsen',
        symptoms
      };
    }
  }),

  explainMedicalTerm: tool({
    description: 'Explain medical terminology in simple language',
    parameters: z.object({
      term: z.string().describe('Medical term to explain'),
      context: z.string().optional().describe('Context where term was found')
    }),
    execute: async ({ term, context }) => {
      // In production, this would query a medical dictionary API
      return {
        term,
        explanation: `General information about "${term}"`,
        context,
        disclaimer: 'This is general information only. Consult your healthcare provider for specifics.'
      };
    }
  }),

  analyzeMedications: tool({
    description: 'Provide information about medications (not recommendations)',
    parameters: z.object({
      medications: z.array(z.string()).describe('List of medications'),
      purpose: z.enum(['information', 'interactions', 'schedule']).optional()
    }),
    execute: async ({ medications, purpose }) => {
      // This would integrate with a drug information API in production
      return {
        medications,
        purpose: purpose || 'information',
        information: 'General medication information',
        disclaimer: 'Always consult your pharmacist or doctor about medications. Never change medications without professional guidance.'
      };
    }
  }),

  prepareForAppointment: tool({
    description: 'Help prepare questions for a doctor appointment',
    parameters: z.object({
      concerns: z.array(z.string()).describe('Health concerns to discuss'),
      appointmentType: z.string().optional()
    }),
    execute: async ({ concerns, appointmentType }) => {
      const questions = concerns.map(concern => ({
        concern,
        suggestedQuestions: [
          `What might be causing ${concern}?`,
          `What tests might help diagnose this?`,
          `What are the treatment options?`,
          `When should I follow up?`
        ]
      }));

      return {
        appointmentType,
        preparedQuestions: questions,
        tips: [
          'Bring a list of all current medications',
          'Note when symptoms started and their frequency',
          'Bring any relevant medical records',
          'Consider bringing a trusted person for support'
        ]
      };
    }
  })
};

// Interface for health context
export interface HealthContext {
  userId: string;
  medications?: MedicalMedication[];
  recentRecords?: MedicalRecord[];
  emergencyInfo?: MedicalEmergencyInfo | null;
  allergies?: string[];
  conditions?: string[];
}

// Build health context from user's medical data
export async function buildHealthContext(userId: string): Promise<HealthContext> {
  try {
    // Fetch user's medical data
    const [medications, records, emergencyInfo] = await Promise.all([
      supabase
        .from('medical_medications')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true),
      supabase
        .from('medical_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('medical_emergency_info')
        .select('*')
        .eq('user_id', userId)
        .single()
    ]);

    return {
      userId,
      medications: medications.data || [],
      recentRecords: records.data || [],
      emergencyInfo: emergencyInfo.data,
      allergies: emergencyInfo.data?.allergies || [],
      conditions: emergencyInfo.data?.medical_conditions || []
    };
  } catch (error) {
    console.error('Error building health context:', error);
    return { userId };
  }
}

// Stream health consultation response
export async function streamHealthConsultation(
  message: string,
  context: HealthContext,
  options: {
    model?: 'fast' | 'accurate' | 'balanced';
    temperature?: number;
    maxTokens?: number;
  } = {}
) {
  const {
    model = 'balanced',
    temperature = 0.3, // Lower temperature for medical accuracy
    maxTokens = 2048
  } = options;

  // Select AI model based on preference
  const aiModel = model === 'accurate' 
    ? anthropic('claude-3-5-sonnet-20241022')
    : model === 'fast'
    ? openai('gpt-3.5-turbo')
    : openai('gpt-4-turbo-preview');

  // Build context-aware system message
  const contextInfo = `
User Medical Context:
- Current Medications: ${context.medications?.map(m => m.name).join(', ') || 'None listed'}
- Known Allergies: ${context.allergies?.join(', ') || 'None listed'}
- Medical Conditions: ${context.conditions?.join(', ') || 'None listed'}
- Recent Medical Records: ${context.recentRecords?.length || 0} documents

Remember: This context is for information only. Do not diagnose based on this data.`;

  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: `${HEALTH_SYSTEM_PROMPT  }\n\n${  contextInfo}`
    },
    {
      role: 'assistant',
      content: 'I understand you have a health-related question. Please remember that I can only provide general health information, not medical advice. For any medical concerns, please consult with a qualified healthcare professional. How can I help you with health information today?'
    },
    {
      role: 'user',
      content: message
    }
  ];

  try {
    const result = await streamText({
      model: aiModel,
      messages,
      tools: healthConsultationTools,
      temperature,
      maxTokens,
      onFinish: async ({ text, usage }) => {
        // Save consultation to database
        await saveConsultation(context.userId, message, text, usage);
      }
    });

    return result;
  } catch (error) {
    console.error('Health consultation error:', error);
    throw new Error('Failed to process health consultation. Please try again.');
  }
}

// Save consultation history
async function saveConsultation(
  userId: string,
  question: string,
  response: string,
  usage: any
) {
  try {
    await supabase
      .from('medical_consultations')
      .insert({
        user_id: userId,
        question,
        response,
        tokens_used: usage?.totalTokens || 0,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error saving consultation:', error);
    // Don't throw - this is not critical
  }
}

// Check if message contains emergency keywords
export function checkForEmergency(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return EMERGENCY_SYMPTOMS.some(symptom => lowerMessage.includes(symptom));
}

// Get disclaimer text
export function getHealthDisclaimer(): string {
  return `
⚠️ IMPORTANT MEDICAL DISCLAIMER ⚠️

This AI assistant provides general health information only. It is NOT a substitute for professional medical advice, diagnosis, or treatment.

• Never disregard professional medical advice or delay seeking it because of information provided here
• Always consult with qualified healthcare professionals for medical concerns
• In case of emergency, call 911 or seek immediate medical attention
• This service does not create a doctor-patient relationship

By using this feature, you acknowledge that:
1. This is for informational purposes only
2. No medical advice is being provided
3. You will consult healthcare professionals for medical needs
4. The information may not be applicable to your specific situation

Your health and safety are important. Please use this tool responsibly.
  `;
}

// Format health consultation for display
export function formatHealthResponse(response: string): string {
  // Add disclaimer to response if not already present
  if (!response.includes('not medical advice')) {
    response += '\n\n📝 Remember: This information is not medical advice. Please consult with healthcare professionals for medical concerns.';
  }
  
  return response;
}