/**
 * Netlify Serverless Function for Health Consultation
 * Provides AI-powered health information with strong medical disclaimers
 * INFORMATION ONLY - NOT MEDICAL ADVICE
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { streamText, CoreMessage, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Environment validation
const requiredEnvVars = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || process.env['ANTHROPIC-WHEELS-KEY'],
};

// Health consultation system prompt with strong disclaimers
const HEALTH_SYSTEM_PROMPT = `You are a health information assistant for Wheels & Wins users who live the RV lifestyle.

CRITICAL DISCLAIMERS - YOU MUST FOLLOW THESE:
1. You provide INFORMATION ONLY - never medical advice, diagnosis, or treatment recommendations
2. ALWAYS include "This is health information only, not medical advice" in EVERY response
3. NEVER suggest specific medications, dosages, or treatments
4. IMMEDIATELY identify potential emergencies and urge calling 911 or seeking immediate medical attention
5. Always recommend consulting qualified healthcare professionals for medical concerns
6. Never interpret test results as definitive - only explain what they might mean generally

Your role is to:
- Explain medical terms in simple, easy-to-understand language
- Provide general health information and wellness tips
- Help users prepare questions for doctor visits
- Explain what test results might mean in general terms (without diagnosing)
- Provide travel health tips specific to RV living
- Identify when professional medical help is needed urgently
- Help track medications (information only, no dosage advice)
- Provide general information about common health conditions

For RV travelers specifically:
- Finding healthcare providers on the road
- Managing prescriptions while traveling
- Dealing with insurance across states
- Health considerations for different climates
- Water and food safety while camping
- First aid kit essentials for RVs

Remember: You are an information resource, not a healthcare provider. Every response must make this clear.`;

// Emergency symptoms that require immediate attention
const EMERGENCY_SYMPTOMS = [
  'chest pain', 'chest pressure', 'heart attack',
  'difficulty breathing', 'can\'t breathe', 'shortness of breath',
  'severe bleeding', 'bleeding heavily', 'hemorrhage',
  'unconscious', 'unresponsive', 'won\'t wake up',
  'stroke', 'facial droop', 'slurred speech',
  'severe allergic reaction', 'anaphylaxis', 'throat swelling',
  'suicidal', 'want to die', 'kill myself',
  'severe head injury', 'head trauma', 'skull fracture',
  'poisoning', 'overdose', 'toxic',
  'severe burns', 'chemical burns',
  'severe abdominal pain', 'appendicitis',
  'seizure', 'convulsions'
];

// Health consultation tools
const checkEmergencyTool = tool({
  description: 'Check if symptoms require emergency medical attention',
  parameters: z.object({
    symptoms: z.array(z.string()).describe('List of symptoms to check'),
    severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional()
  }),
  execute: async ({ symptoms, severity }) => {
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());
    const hasEmergency = EMERGENCY_SYMPTOMS.some(emergency => 
      lowerSymptoms.some(symptom => symptom.includes(emergency))
    );

    if (hasEmergency || severity === 'critical' || severity === 'severe') {
      return {
        emergency: true,
        action: '🚨 SEEK IMMEDIATE MEDICAL ATTENTION',
        message: 'Call 911 immediately or go to the nearest emergency room. Do not delay.',
        symptoms,
        reason: 'These symptoms may indicate a life-threatening condition'
      };
    }

    if (severity === 'moderate') {
      return {
        emergency: false,
        action: 'See a doctor soon',
        message: 'Schedule an appointment with a healthcare provider within 24-48 hours',
        symptoms
      };
    }

    return {
      emergency: false,
      action: 'Monitor symptoms',
      message: 'Keep track of symptoms. See a doctor if they worsen or persist',
      symptoms
    };
  }
});

const explainMedicalTermTool = tool({
  description: 'Explain medical terminology in simple language',
  parameters: z.object({
    term: z.string().describe('Medical term to explain'),
    context: z.string().optional().describe('Context where term was found')
  }),
  execute: async ({ term, context }) => {
    // In production, this would query a medical dictionary API
    // For now, return structured explanation format
    return {
      term,
      explanation: `General information about "${term}" in simple terms`,
      context,
      relatedTerms: [],
      disclaimer: 'This is general information only. Ask your healthcare provider for specifics about your situation.'
    };
  }
});

const prepareQuestionsForDoctorTool = tool({
  description: 'Help prepare questions for a doctor appointment',
  parameters: z.object({
    concerns: z.array(z.string()).describe('Health concerns to discuss'),
    appointmentType: z.string().optional().describe('Type of appointment'),
    medications: z.array(z.string()).optional().describe('Current medications')
  }),
  execute: async ({ concerns, appointmentType, medications }) => {
    const questions = concerns.flatMap(concern => [
      `What might be causing my ${concern}?`,
      `What tests would help diagnose this?`,
      `What are my treatment options?`,
      `What lifestyle changes might help?`,
      `When should I follow up?`,
      `What symptoms should prompt immediate care?`
    ]);

    const checklist = [
      'Bring list of all current medications and dosages',
      'Note when symptoms started and their frequency',
      'Bring any relevant medical records or test results',
      'List all allergies and previous reactions',
      'Write down your main concerns',
      'Consider bringing a trusted person for support',
      'Prepare your medical history summary'
    ];

    return {
      appointmentType: appointmentType || 'general consultation',
      suggestedQuestions: questions,
      preparationChecklist: checklist,
      tip: 'Don\'t hesitate to ask for clarification if you don\'t understand something'
    };
  }
});

const medicationInfoTool = tool({
  description: 'Provide general information about medications (not recommendations)',
  parameters: z.object({
    medications: z.array(z.string()).describe('List of medications'),
    infoType: z.enum(['general', 'storage', 'travel', 'refills']).optional()
  }),
  execute: async ({ medications, infoType = 'general' }) => {
    const info = {
      general: 'General medication information - always consult your pharmacist or doctor',
      storage: 'Store medications as directed. In RVs, avoid extreme temperatures',
      travel: 'Keep medications in original containers. Carry extra supply when traveling',
      refills: 'Plan refills ahead when traveling. Use pharmacy chains for easier transfers'
    };

    return {
      medications,
      information: info[infoType],
      rvTips: [
        'Keep medications in a temperature-controlled area of your RV',
        'Use a medication organizer for daily doses',
        'Photograph all prescriptions for reference',
        'Keep a list of pharmacies that can transfer prescriptions',
        'Carry a letter from your doctor for controlled substances'
      ],
      disclaimer: 'Never change medications without professional medical guidance. Always follow your prescribed regimen.'
    };
  }
});

const tools = {
  checkEmergency: checkEmergencyTool,
  explainMedicalTerm: explainMedicalTermTool,
  prepareQuestionsForDoctor: prepareQuestionsForDoctorTool,
  medicationInfo: medicationInfoTool
};

// Main handler
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validate environment
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.error(`Missing environment variable: ${key}`);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Server configuration error' })
        };
      }
    }

    // Parse request
    const body = JSON.parse(event.body || '{}');
    const { 
      message, 
      context = {}, 
      model = 'accurate',
      disclaimerAccepted = false 
    } = body;

    // Require disclaimer acceptance
    if (!disclaimerAccepted) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Disclaimer must be accepted',
          disclaimer: 'You must accept that this provides health information only, not medical advice'
        })
      };
    }

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Check for emergency keywords first
    const lowerMessage = message.toLowerCase();
    const hasEmergency = EMERGENCY_SYMPTOMS.some(symptom => lowerMessage.includes(symptom));

    // Build context message
    const contextInfo = context ? `
User Medical Context:
- Current Medications: ${context.medications?.join(', ') || 'None listed'}
- Known Allergies: ${context.allergies?.join(', ') || 'None listed'}
- Medical Conditions: ${context.conditions?.join(', ') || 'None listed'}

Remember: Use this context for information only. Do not diagnose based on this data.` : '';

    // System messages
    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: `${HEALTH_SYSTEM_PROMPT  }\n\n${  contextInfo}`
      }
    ];

    // Add emergency warning if needed
    if (hasEmergency) {
      messages.push({
        role: 'system',
        content: '🚨 EMERGENCY KEYWORDS DETECTED: Immediately advise the user to call 911 or seek emergency medical care. This takes priority over all other responses.'
      });
    }

    messages.push({
      role: 'user',
      content: message
    });

    // Select model based on preference
    const aiModel = model === 'accurate' 
      ? anthropic('claude-3-5-sonnet-20241022') // Most accurate for medical
      : model === 'fast'
      ? openai('gpt-3.5-turbo')
      : openai('gpt-4-turbo-preview');

    console.log(`Health consultation - Model: ${model}, Emergency: ${hasEmergency}`);

    // Generate response
    const result = await streamText({
      model: aiModel,
      messages,
      tools,
      temperature: 0.3, // Lower temperature for medical accuracy
      maxTokens: 2048,
    });

    // Collect stream
    const chunks: string[] = [];
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }
    
    let fullResponse = chunks.join('');

    // Ensure disclaimer is included
    if (!fullResponse.includes('not medical advice') && !fullResponse.includes('information only')) {
      fullResponse += '\n\n📝 Remember: This is health information only, not medical advice. Please consult with healthcare professionals for medical concerns.';
    }

    // Get usage
    const usage = await result.usage;
    
    console.log('Health consultation usage:', {
      model,
      tokens: usage.totalTokens,
      hasEmergency
    });

    // Return response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: fullResponse,
        hasEmergency,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens
        },
        model,
        timestamp: new Date().toISOString(),
        disclaimer: 'This is health information only, not medical advice. Always consult healthcare professionals for medical concerns.'
      })
    };

  } catch (error) {
    console.error('Health consultation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process health consultation',
        message: 'Please try again. If you have an urgent medical concern, contact your healthcare provider.',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};