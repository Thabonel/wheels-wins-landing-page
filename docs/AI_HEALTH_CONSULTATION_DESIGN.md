# AI Health Consultation Feature Design

## Overview
Integrate AI-powered health consultation into the Medical Records feature using Vercel AI SDK v5.0.5 with advanced streaming, tool calling, and context-aware responses.

## Architecture

### 1. Core Components

#### A. Health AI Service (`/src/services/health-ai/`)
```typescript
// healthAiService.ts
- Main orchestrator for health consultations
- Context management from medical records
- Safety guardrails and disclaimers
- Response streaming and caching

// healthTools.ts
- Symptom checker tool
- Drug interaction checker
- Medical information search
- Emergency detection
- Appointment scheduling suggestions

// healthContext.ts
- Medical history aggregation
- Medication context builder
- Emergency info retrieval
- Document summarization
```

#### B. UI Components (`/src/components/you/medical/ai-consultation/`)
```typescript
// HealthConsultation.tsx
- Main consultation interface
- Chat-based interaction
- Voice input support (future)

// ConsultationHistory.tsx
- Previous consultations
- Saved recommendations
- Follow-up reminders

// HealthInsights.tsx
- AI-generated health insights
- Trend analysis from records
- Preventive care suggestions
```

### 2. AI SDK Integration Pattern

```typescript
import { streamText, tool, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

// Health-specific system prompt
const HEALTH_SYSTEM_PROMPT = `
You are a medical information assistant for Wheels & Wins users.

IMPORTANT DISCLAIMERS:
- You provide health information only, NOT medical advice
- Always recommend consulting healthcare professionals
- Never diagnose conditions or prescribe treatments
- Identify emergency situations and advise immediate medical attention

Your capabilities:
1. Explain medical terms and test results
2. Provide general health information
3. Suggest questions for doctor visits
4. Track medication schedules
5. Identify potential drug interactions (informational only)
6. Provide travel health tips for RV lifestyle

User Context Available:
- Medical history
- Current medications
- Allergies
- Emergency contacts
`;

// Health consultation tools
const healthTools = {
  checkSymptoms: tool({
    description: 'Provide information about symptoms',
    parameters: z.object({
      symptoms: z.array(z.string()),
      duration: z.string().optional(),
      severity: z.enum(['mild', 'moderate', 'severe'])
    }),
    execute: async ({ symptoms, duration, severity }) => {
      // Information retrieval logic
      // Never diagnose - only provide educational info
    }
  }),

  checkDrugInteraction: tool({
    description: 'Check for potential drug interactions',
    parameters: z.object({
      medications: z.array(z.string()),
      newMedication: z.string()
    }),
    execute: async ({ medications, newMedication }) => {
      // Query drug interaction database
      // Return informational warnings only
    }
  }),

  analyzeTestResult: tool({
    description: 'Explain medical test results',
    parameters: z.object({
      testType: z.string(),
      results: z.record(z.any()),
      referenceRanges: z.record(z.any()).optional()
    }),
    execute: async ({ testType, results, referenceRanges }) => {
      // Explain what results mean
      // Compare to reference ranges
      // Suggest follow-up questions for doctor
    }
  }),

  emergencyCheck: tool({
    description: 'Identify potential emergency situations',
    parameters: z.object({
      symptoms: z.array(z.string()),
      vitals: z.record(z.number()).optional()
    }),
    execute: async ({ symptoms, vitals }) => {
      // Check for emergency indicators
      // Return urgency level and recommended action
    }
  })
};
```

### 3. Implementation Phases

#### Phase 1: Basic Consultation (MVP)
- Text-based health Q&A
- Integration with medical records context
- Basic symptom information
- Medication reminders
- Emergency detection

#### Phase 2: Advanced Features
- Document analysis (OCR integration)
- Test result interpretation
- Drug interaction checking
- Travel health advisories
- Vaccination reminders

#### Phase 3: Predictive & Proactive
- Health trend analysis
- Preventive care suggestions
- Appointment scheduling
- Integration with wearables
- Voice consultation

### 4. Safety & Compliance

#### Medical Disclaimers
```typescript
const MEDICAL_DISCLAIMER = {
  required: true,
  text: "This AI assistant provides health information only. It is not a substitute for professional medical advice, diagnosis, or treatment.",
  mustAccept: true,
  showEvery: 'session'
};
```

#### Guardrails
1. **No Diagnosis**: Never provide definitive diagnoses
2. **No Prescriptions**: Never suggest specific medications
3. **Emergency Detection**: Identify and escalate emergencies
4. **Professional Referral**: Always recommend doctor consultation
5. **Information Only**: Clearly label as educational content

#### Data Privacy
- HIPAA-compliant data handling
- Encrypted storage in Supabase
- No sharing with third parties
- User consent for AI processing
- Right to delete all health data

### 5. User Experience Flow

```
1. User opens Medical Records → AI Consultation tab
2. Disclaimer shown (if first time or new session)
3. AI loads user's medical context (with permission)
4. User asks health question
5. AI processes with context + tools
6. Streaming response with:
   - Information/explanation
   - Relevant medical records
   - Suggested actions
   - Professional consultation reminder
7. Save consultation to history
8. Optional: Set follow-up reminders
```

### 6. Context Building

```typescript
interface HealthContext {
  // From medical_records table
  recentDocuments: MedicalRecord[];
  
  // From medical_medications table
  currentMedications: MedicalMedication[];
  upcomingRefills: MedicalMedication[];
  
  // From medical_emergency_info table
  allergies: string[];
  conditions: string[];
  bloodType: string;
  
  // Computed insights
  medicationAdherence: number;
  healthTrends: HealthTrend[];
  riskFactors: string[];
}

async function buildHealthContext(userId: string): Promise<HealthContext> {
  // Aggregate user's medical data
  // Compute insights and trends
  // Return structured context for AI
}
```

### 7. Streaming Response Pattern

```typescript
async function streamHealthConsultation(
  message: string,
  context: HealthContext,
  userId: string
) {
  const messages: CoreMessage[] = [
    {
      role: 'system',
      content: HEALTH_SYSTEM_PROMPT + 
               `\n\nUser Medical Context:\n${JSON.stringify(context, null, 2)}`
    },
    {
      role: 'user',
      content: message
    }
  ];

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'), // Best for medical accuracy
    messages,
    tools: healthTools,
    temperature: 0.3, // Lower temperature for medical accuracy
    maxTokens: 2048,
    onFinish: async ({ text, usage }) => {
      // Save consultation to database
      await saveConsultation(userId, message, text, usage);
    }
  });

  return result;
}
```

### 8. Database Schema Addition

```sql
-- Health consultations history
CREATE TABLE medical_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  context_used JSONB,
  tools_called JSONB,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health insights generated by AI
CREATE TABLE medical_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'trend', 'risk', 'reminder', 'suggestion'
  content TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  related_records JSONB, -- IDs of related medical records
  action_required BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9. Cost Management

```typescript
const COST_LIMITS = {
  perUser: {
    daily: 100_000, // tokens
    monthly: 2_000_000 // tokens
  },
  costPerToken: {
    'gpt-4-turbo': 0.00001,
    'claude-3-5-sonnet': 0.00003,
    'gpt-3.5-turbo': 0.0000005
  }
};

// Model selection based on query complexity
function selectModel(query: string, userTier: string): string {
  if (query.includes('emergency') || query.includes('urgent')) {
    return 'claude-3-5-sonnet'; // Most accurate for critical
  }
  if (userTier === 'premium') {
    return 'gpt-4-turbo';
  }
  return 'gpt-3.5-turbo'; // Cost-effective for basic queries
}
```

### 10. Integration Points

1. **Medical Records**: Pull document context
2. **Medications**: Check interactions, reminders
3. **Emergency Info**: Quick access in emergencies
4. **PAM Assistant**: Unified assistant experience
5. **Notifications**: Health reminders and alerts
6. **Travel Planning**: Health considerations for trips

## Implementation Checklist

### Phase 1 (MVP) - 2 weeks
- [ ] Create health AI service structure
- [ ] Build basic consultation UI
- [ ] Implement safety disclaimers
- [ ] Add context aggregation
- [ ] Create streaming endpoint
- [ ] Add consultation history
- [ ] Implement emergency detection
- [ ] Add basic health tools
- [ ] Test with sample data
- [ ] Deploy to staging

### Phase 2 (Enhanced) - 3 weeks
- [ ] Add document analysis
- [ ] Implement drug interaction checker
- [ ] Create health insights engine
- [ ] Add voice input support
- [ ] Build consultation analytics
- [ ] Implement cost tracking
- [ ] Add export functionality
- [ ] Create health reports

### Phase 3 (Advanced) - 4 weeks
- [ ] Predictive health analysis
- [ ] Wearable integration
- [ ] Appointment scheduling
- [ ] Multi-language support
- [ ] Offline consultation cache
- [ ] Health community features
- [ ] Research trial matching
- [ ] Insurance integration

## Success Metrics

1. **Usage Metrics**
   - Daily active consultations
   - Questions per user
   - Return user rate
   - Feature adoption rate

2. **Quality Metrics**
   - Response accuracy (medical professional review)
   - Emergency detection rate
   - User satisfaction score
   - Professional referral rate

3. **Safety Metrics**
   - Disclaimer acceptance rate
   - Emergency escalations
   - Inappropriate medical advice (should be 0)
   - Data privacy compliance

4. **Cost Metrics**
   - Average tokens per consultation
   - Cost per user per month
   - Model usage distribution
   - Cache hit rate

## Risk Mitigation

1. **Medical Liability**
   - Clear disclaimers
   - No diagnosis/prescription
   - Professional referral emphasis
   - Audit trail of all interactions

2. **Data Privacy**
   - HIPAA compliance review
   - Encryption at rest and in transit
   - User consent management
   - Data deletion rights

3. **AI Hallucination**
   - Low temperature settings
   - Fact-checking tools
   - Reference medical databases
   - Human review for critical responses

4. **Cost Overrun**
   - User quotas
   - Model tiering
   - Response caching
   - Batch processing for insights

## Conclusion

The AI Health Consultation feature will provide valuable health information support while maintaining strict safety guidelines. By leveraging the Vercel AI SDK v5.0.5's advanced capabilities, we can create a responsive, context-aware health assistant that enhances the medical records feature without replacing professional medical care.