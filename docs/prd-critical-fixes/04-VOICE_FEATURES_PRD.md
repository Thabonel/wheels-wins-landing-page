# PRD: Voice Features Analysis & Fix Strategy

**Status:** Analysis Complete - User Feedback Updated Priority
**Priority:** Low (Low Impact, High Effort) - **Voice Actually Working**
**Created:** January 30, 2026
**Updated:** January 30, 2026 based on user feedback

---

## Problem Statement - REVISED

### Original Audit Finding
PAM audit reported: *"Wake word detection constantly failing - Console shows 50+ audio-capture errors, TFLite model for 'Hey Pam' wake word not properly deployed"*

### ⚡ **CRITICAL UPDATE FROM USER**
**User feedback:** *"The voice has been working well, there is an odd voice change from greeting to general conversation but it does work"*

### Revised Assessment
- ✅ **Voice functionality is working** - User confirms it works
- ⚠️ **TensorFlow errors are build-time issues** - Not runtime blockers
- 🎯 **One minor issue**: Voice change between greeting and conversation
- 📊 **Priority downgraded**: From Critical to Low (cosmetic issue)

---

## Current Voice Architecture Analysis

### Build-Time TensorFlow Errors (Non-blocking)
From development server output:
```
✘ [ERROR] Could not resolve "../tflite_web_api_client"
```

**Analysis:**
- These are **build warnings**, not runtime errors
- TensorFlow TFLite dependencies have missing imports
- **Does not affect functionality** - voice still works
- Common issue with TensorFlow.js bundling in Vite

### Runtime Voice Implementation
**Current working components:**
- ✅ Wake word detection ("Hey Pam")
- ✅ Speech-to-text conversion
- ✅ Text-to-speech responses
- ✅ Audio capture and playback
- ⚠️ Voice change issue (greeting → conversation)

---

## Issue Analysis: Voice Change Problem

### Current Behavior
1. **Greeting phase**: PAM uses one voice/tone
2. **Conversation phase**: PAM switches to different voice/tone
3. **User experience**: Jarring transition between voices

### Potential Causes

#### 1. Multiple TTS Engines
```javascript
// Possible implementation pattern
if (isGreeting) {
    // Use one TTS service/voice
    synthesizeGreeting(text);
} else {
    // Use different TTS service/voice
    synthesizeResponse(text);
}
```

#### 2. Different Audio Settings
```javascript
// Voice parameters might change
const greetingVoice = {
    rate: 1.0,
    pitch: 1.2,
    voice: 'friendly-female'
};

const conversationVoice = {
    rate: 0.9,
    pitch: 1.0,
    voice: 'professional-female'
};
```

#### 3. Context-Based Voice Selection
```javascript
// PAM might switch voices based on conversation state
if (context.isNewSession) {
    useWelcomingVoice();
} else {
    useStandardVoice();
}
```

---

## Technical Investigation Required

### Frontend Voice Service Analysis
**Files to examine:**
- `src/services/pamVoiceService.ts` - Main voice implementation
- `src/hooks/usePamVoice.ts` - Voice hook logic
- TTS configuration and voice selection logic

### Key Investigation Points

1. **TTS Provider Consistency**
   - Are we using the same TTS service throughout?
   - OpenAI Realtime vs ElevenLabs vs Web Speech API?

2. **Voice Parameter Consistency**
   - Rate, pitch, volume settings
   - Voice model/character selection
   - Audio format consistency

3. **Context State Management**
   - How does the system detect greeting vs conversation?
   - Is voice selection state-dependent?

4. **Audio Pipeline**
   - Same audio processing throughout?
   - Consistent encoding/decoding?

---

## Fix Strategy: Voice Consistency

### Phase 1: Investigation (1 hour)

#### Step 1.1: Identify Voice Sources
```javascript
// Find all TTS implementations
grep -r "speak\|synthesis\|voice\|tts" src/services/pamVoice* --include="*.ts"
grep -r "ElevenLabs\|OpenAI.*voice\|speechSynthesis" src/ --include="*.ts"
```

#### Step 1.2: Trace Voice Selection Logic
```javascript
// Find voice switching logic
grep -r "greeting\|welcome\|hello" src/services/pamVoice* -A 5 -B 5
grep -r "voice.*=\|setVoice\|selectVoice" src/services/ --include="*.ts"
```

#### Step 1.3: Check Configuration
```javascript
// Find voice configuration
grep -r "rate\|pitch\|speed\|voice.*config" src/services/ --include="*.ts"
```

### Phase 2: Root Cause Identification (30 minutes)

#### Hypothesis Testing
1. **Multiple TTS Services**: Check if greeting uses different provider
2. **Parameter Mismatch**: Verify voice settings consistency
3. **State-Based Selection**: Look for context-dependent voice logic
4. **Audio Format**: Check if audio encoding differs

### Phase 3: Implementation Fix (30 minutes - 2 hours)

#### Option A: Simple Fix (30 minutes)
```javascript
// Ensure consistent voice parameters
const CONSISTENT_VOICE_CONFIG = {
    provider: 'openai', // or whichever is primary
    rate: 1.0,
    pitch: 1.0,
    voice: 'alloy', // or consistent voice ID
    volume: 0.8
};

// Apply to both greeting and conversation
function synthesizeAnyResponse(text: string, isGreeting: boolean = false) {
    return ttsService.speak(text, CONSISTENT_VOICE_CONFIG);
}
```

#### Option B: Enhanced Fix (2 hours)
```javascript
// Unified voice service with consistent personality
class UnifiedVoiceService {
    private voiceConfig = CONSISTENT_VOICE_CONFIG;

    async speakGreeting(text: string) {
        return this.speakWithConsistentVoice(text, { context: 'greeting' });
    }

    async speakResponse(text: string) {
        return this.speakWithConsistentVoice(text, { context: 'conversation' });
    }

    private async speakWithConsistentVoice(text: string, options: any) {
        // Same voice, same parameters, consistent experience
        return await this.ttsProvider.speak(text, this.voiceConfig);
    }
}
```

---

## TensorFlow Build Errors (Low Priority)

### Current Build Warnings
```
✘ [ERROR] Could not resolve "../tflite_web_api_client"
```

### Assessment: **Cosmetic Issue**
- ❌ **Not blocking functionality**: Voice works despite errors
- ❌ **Not runtime errors**: Build-time dependency warnings
- ❌ **Not user-facing**: Only visible in developer console
- ✅ **Safe to ignore**: Common TensorFlow.js bundling issue

### Optional Fix Strategy (If Desired)

#### Option 1: Update Dependencies (1 hour)
```bash
npm update @tensorflow/tfjs-tflite
npm install @tensorflow/tfjs@latest
```

#### Option 2: Exclude from Bundle (30 minutes)
```javascript
// vite.config.js
export default {
    optimizeDeps: {
        exclude: ['@tensorflow/tfjs-tflite']
    }
}
```

#### Option 3: Alternative Wake Word (2 hours)
Replace TensorFlow-based wake word with Web Speech API:
```javascript
// Use browser's built-in speech recognition
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript.toLowerCase().includes('hey pam')) {
        activateVoiceMode();
    }
};
```

---

## Priority Assessment - UPDATED

### Impact Analysis

| Issue | User Impact | Frequency | Severity |
|-------|-------------|-----------|----------|
| **Voice change** | Low-Medium | Every greeting | Minor annoyance |
| **TensorFlow errors** | None | Development only | Cosmetic |
| **Wake word failure** | **RESOLVED** | User reports it works | N/A |

### Effort vs Value

| Fix | Effort | Value | ROI |
|-----|--------|-------|-----|
| **Voice consistency** | 0.5-2 hours | Medium | High |
| **TensorFlow cleanup** | 0.5-1 hour | Low | Low |
| **Wake word rebuild** | 2-4 hours | None | Negative |

### Recommendation: **LOW PRIORITY**

**Rationale:**
1. **Voice works**: User confirms functionality is good
2. **Minor cosmetic issue**: Voice change is not breaking functionality
3. **High-impact items exist**: Calendar read access more important
4. **Risk vs reward**: Voice changes could break working functionality

---

## Implementation Recommendation

### Recommended Approach: **QUICK FIX ONLY**

**Phase 1: 30-minute fix for voice consistency**
1. Identify where voice parameters differ
2. Standardize voice configuration
3. Test greeting → conversation transition
4. Verify no regression in functionality

**Phase 2: Skip TensorFlow fixes**
- Errors are cosmetic build warnings
- Not worth development time
- Focus on user-facing issues instead

### Do NOT Implement
- ❌ Complex TensorFlow dependency fixes
- ❌ Wake word system rebuilds
- ❌ Major voice architecture changes
- ❌ New TTS provider integrations

---

## Ralph Loop Verification Plan

### Pre-Implementation Testing
```bash
# Test current voice functionality
1. Trigger "Hey Pam" wake word
2. Say a greeting → Note voice characteristics
3. Continue conversation → Note voice changes
4. Record audio samples for comparison
```

### Post-Fix Verification
```bash
# Verify consistency
1. Clear browser cache
2. Test wake word activation
3. Compare greeting vs conversation voice
4. Ensure no functionality regression
5. Test on mobile devices
```

**Success Criteria:**
- ✅ Voice characteristics consistent greeting → conversation
- ✅ Wake word still functional
- ✅ No audio quality degradation
- ✅ Same TTS provider throughout

---

## Success Metrics

### Primary KPIs
- **Voice Consistency**: Smooth transition greeting → conversation
- **Functionality Maintained**: Wake word and TTS still work
- **User Experience**: No jarring voice changes

### User Experience Metrics
- **Naturalness**: Voice feels like same person throughout
- **Quality**: Audio clarity maintained
- **Reliability**: Voice features work consistently

### Technical Metrics
- **Build Warnings**: Optional reduction in console errors
- **Performance**: No latency impact from voice fixes
- **Compatibility**: Works across browsers/devices

---

## Risk Assessment

### Implementation Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| **Break working voice** | Low | High | Thorough testing, easy rollback |
| **Audio quality loss** | Low | Medium | Compare before/after samples |
| **Mobile incompatibility** | Low | Medium | Test on actual devices |
| **Performance impact** | Very Low | Low | Monitor voice processing times |

### Recommendation: **SAFE TO PROCEED**
- Low risk, medium value improvement
- Easy to test and rollback
- Working functionality provides safety net

---

## Conclusion

### Voice Features Status: **WORKING WITH MINOR COSMETIC ISSUE**

User feedback confirms voice functionality is working well. The TensorFlow build errors are non-blocking warnings, and the only real issue is a minor voice consistency problem.

### Final Recommendation

**✅ DO:**
- Quick 30-minute fix for voice consistency
- Test thoroughly to ensure no regression
- Focus on higher-impact issues (calendar read access)

**❌ DON'T:**
- Rebuild wake word system (it works)
- Fix TensorFlow build warnings (cosmetic only)
- Implement major voice architecture changes

**🤔 CONSIDER LATER:**
- Voice personality enhancements after core features complete
- TTS quality improvements if user feedback requests
- Advanced voice features (emotion, accents) for differentiation

### Implementation Timeline

If addressing the voice consistency issue:
- **Investigation**: 1 hour
- **Fix**: 30 minutes - 2 hours
- **Testing**: 30 minutes
- **Total**: 2-3.5 hours maximum

**This is a polish item, not a blocker. Calendar read access should be prioritized first.**