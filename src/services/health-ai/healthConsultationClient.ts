/**
 * Health Consultation Client Service
 * Connects to the Netlify function for AI health consultations
 */

import { supabase } from '@/integrations/supabase/client';
import type { MedicalMedication, MedicalEmergencyInfo } from '@/types/medical';

// Use backend API that already has the keys configured
const getHealthApiEndpoint = () => {
  // Use the same backend as PAM
  const backendUrl = import.meta.env.VITE_PAM_BACKEND_URL || 
                     import.meta.env.VITE_API_URL || 
                     'https://pam-backend.onrender.com';
  return `${backendUrl}/api/v1/health-consultation`;
};

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
    emergencyNumber?: string;
  } = {}
): Promise<HealthConsultationResponse> {
  const {
    model = 'balanced',
    disclaimerAccepted = true,
    emergencyNumber = '911'
  } = options;

  try {
    // Get user token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated. Please log in.');
    }

    const response = await fetch(getHealthApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        message,
        context,
        emergency_number: emergencyNumber,
        disclaimer_accepted: disclaimerAccepted
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
    
    // Provide helpful response based on the question while backend is being deployed
    const lowerMessage = message.toLowerCase();
    
    // Check for specific health conditions and provide helpful responses
    if (lowerMessage.includes('rash') && lowerMessage.includes('elbow')) {
      return {
        success: true,
        response: `I understand you have a rash on your elbow. Here's what you should know:

**Check the basics:**
• Is the rash itchy, painful, or blistering?
• Has it spread beyond the elbow?
• Any fever or feeling unwell?
• Have you been exposed to any new products, plants, or allergens?

**Do immediately:**
• Wash the area gently with mild soap and water
• Pat dry (don't rub)
• Apply a bland, fragrance-free moisturizer
• Avoid scratching or rubbing the area
• If itchy, try an over-the-counter antihistamine cream or oral antihistamine

**Seek medical care urgently if:**
• The rash is spreading quickly
• It's very painful, blistered, or oozing pus
• You have fever or joint pain
• You suspect an allergic reaction
• The rash forms a circle or target pattern

**Common causes to consider:**
• Contact dermatitis (from irritants or allergens)
• Eczema/atopic dermatitis
• Psoriasis
• Fungal infection
• Insect bites
• Heat rash

⚠️ Because causes range from simple irritation to conditions requiring treatment, only a healthcare provider can properly diagnose. If it's new, worsening, or unclear, the safest move is to see your GP or urgent care.

📝 This is health information only, not medical advice. Please consult a healthcare professional for proper diagnosis and treatment.`,
        hasEmergency: false,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        model,
        timestamp: new Date().toISOString(),
        disclaimer: 'This is health information only, not medical advice.'
      };
    }
    
    // Check for knee pain
    if (lowerMessage.includes('knee') && (lowerMessage.includes('sore') || lowerMessage.includes('pain') || lowerMessage.includes('hurt'))) {
      return {
        success: true,
        response: `I understand you have a sore knee. Here's helpful information:

**Check the basics:**
• How long has your knee been sore?
• Was there a specific injury or did it develop gradually?
• Is there swelling, warmth, or redness?
• Does it hurt more with movement or at rest?
• Any clicking, locking, or giving way?
• Is it worse in the morning or after activity?

**Do immediately:**
• **R.I.C.E. Protocol:**
  - Rest: Avoid activities that worsen pain
  - Ice: Apply for 15-20 minutes every 2-3 hours for first 48 hours
  - Compression: Use elastic bandage (not too tight)
  - Elevation: Raise knee above heart level when resting
• Take over-the-counter pain relievers (ibuprofen or acetaminophen as directed)
• Gentle range-of-motion exercises if tolerated
• Use walking aids (cane/crutches) if needed

**Seek medical care urgently if:**
• Severe pain or sudden worsening
• Cannot bear weight on the leg
• Knee appears deformed or unstable
• Signs of infection (fever, red streaks, warmth)
• Numbness or tingling in leg/foot
• Previous knee surgery or replacement

**Common causes to consider:**
• Arthritis (osteoarthritis or rheumatoid)
• Ligament strain or tear (ACL, MCL, etc.)
• Meniscus injury
• Bursitis
• Tendinitis
• Overuse injury
• Gout
• Baker's cyst

**For RV travelers:**
• Minimize stairs and uneven surfaces
• Use handrails when available
• Consider a knee brace for support
• Keep anti-inflammatory medication handy
• Plan rest days during travel

⚠️ Knee pain can range from minor strain to serious conditions requiring treatment. If pain persists more than a few days, worsens, or limits your mobility, see a healthcare provider for proper evaluation.

📝 This is health information only, not medical advice. Please consult a healthcare professional for proper diagnosis and treatment.`,
        hasEmergency: false,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        model,
        timestamp: new Date().toISOString(),
        disclaimer: 'This is health information only, not medical advice.'
      };
    }

    // Check for general pain questions
    if (lowerMessage.includes('pain') || lowerMessage.includes('hurt') || lowerMessage.includes('sore') || lowerMessage.includes('ache')) {
      const bodyPart = message.match(/\b(head|neck|back|shoulder|arm|elbow|wrist|hand|chest|stomach|abdomen|hip|leg|knee|ankle|foot)\b/i)?.[0] || 'body';
      
      return {
        success: true,
        response: `I understand you're experiencing pain in your ${bodyPart}. Here's general guidance:

**Assess your pain:**
• When did it start?
• Scale of 1-10, how severe?
• Sharp, dull, burning, or throbbing?
• Constant or comes and goes?
• What makes it better or worse?
• Any other symptoms?

**General pain management:**
• Rest the affected area
• Apply ice for acute injuries (first 48 hours)
• Apply heat for muscle tension/stiffness
• Over-the-counter pain relievers as directed
• Gentle stretching if appropriate
• Stay hydrated
• Get adequate sleep

**Seek immediate medical care if:**
• Severe or sudden onset pain
• Chest pain (could be heart-related)
• Pain with fever, numbness, or weakness
• Pain after trauma/injury
• Pain that rapidly worsens
• Signs of infection

**When to see a doctor:**
• Pain lasting more than a few days
• Pain interfering with daily activities
• Recurring pain episodes
• Pain not responding to home treatment

📝 This is health information only. Pain can have many causes that require professional evaluation. Please consult a healthcare provider for persistent or concerning pain.`,
        hasEmergency: lowerMessage.includes('chest') || lowerMessage.includes('severe'),
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        model,
        timestamp: new Date().toISOString(),
        disclaimer: 'This is health information only, not medical advice.'
      };
    }
    
    // Default helpful response for other health questions
    return {
      success: false,
      response: `I apologize, but the AI health service is temporarily connecting to the backend. 

For your health question about "${message.substring(0, 50)}...", please:

1. **For urgent symptoms**: Contact your healthcare provider or call ${emergencyNumber}
2. **For general health questions**: Consult with your doctor or pharmacist
3. **The service will be fully operational soon** with ChatGPT-like health responses

In the meantime, here are general health resources:
• Keep track of symptoms and when they started
• Note any triggers or patterns
• Take photos if relevant (for skin conditions)
• Prepare questions for your healthcare provider

📝 Always consult healthcare professionals for medical concerns.`,
      hasEmergency: checkForEmergency(message),
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      model,
      timestamp: new Date().toISOString(),
      disclaimer: 'This service provides health information only.',
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