# PAM Language Handling - Test Verification Plan

**Date**: November 15, 2025
**Status**: Implementation Complete - Testing Phase
**Branch**: staging

## Implementation Summary

Successfully implemented end-to-end language handling for PAM voice and text interactions across 5 components:

### 1. Database Layer ✅
- **File**: `docs/sql-fixes/add_language_to_profiles.sql`
- **Changes**: Added `language` column to profiles table with CHECK constraint
- **Supported Languages**: en, es, fr, de, pt, it
- **Default**: 'en' for all existing users
- **Verification**: User confirmed migration applied successfully (1 user with language 'en')

### 2. Cache Layer ✅
- **File**: `backend/app/services/pam/tools/load_user_profile.py`
- **Changes**:
  - Line 75: Added `"language": "en"` to fallback profile structure
  - Line 90: Added `"language": profile.get("language", "en")` to enhanced_profile
- **Purpose**: Profile cache now includes user's language preference

### 3. Backend Voice Bridge ✅
- **File**: `backend/app/api/v1/pam_realtime_hybrid.py`
- **Changes**:
  - Line 261: Changed from immediate PAM instantiation to deferred
  - Line 281: Extract language from context: `user_language = context.get("language", "en")`
  - Line 282: Pass language to get_pam(): `pam = await get_pam(user_id, user_language=user_language)`
- **Purpose**: Each WebSocket message now configures PAM with user's language

### 4. Frontend Voice Service ✅
- **Files**:
  - `src/services/pamVoiceHybridService.ts`
  - `src/components/Pam.tsx`
- **Changes**:
  - Added `language`, `location`, `currentPage` to VoiceSessionConfig interface
  - Updated sendToClaudeBridge to include full context object with language
  - Modified Pam.tsx to extract language from settings and pass to voice service
- **Purpose**: Frontend now sends user's language preference in every voice message

### 5. Web Speech API ✅
- **File**: `src/components/pam/voice/VoiceToggle.tsx`
- **Changes**:
  - Added `useUserSettings` hook
  - Extracted user language: `const userLanguage = settings?.display_preferences?.language || 'en-US'`
  - Passed to useVoiceInput: `{ lang: userLanguage }`
- **Purpose**: Browser speech recognition now uses user's preferred language

## Test Plan

### Test 1: Database Verification ✅
**Status**: PASSED (User confirmed)

**SQL Query**:
```sql
SELECT COUNT(*) as total_users, language
FROM profiles
GROUP BY language
ORDER BY total_users DESC;
```

**Expected Result**:
```
| total_users | language |
| ----------- | -------- |
| 1           | en       |
```

**Actual Result**: PASSED ✅

### Test 2: Profile Tool Language Extraction
**Status**: Ready for Manual Test

**Test Steps**:
1. Open PAM chat interface at http://localhost:8080
2. Send a message to trigger profile loading
3. Check backend logs for profile load confirmation

**Expected Backend Log**:
```python
🔍 PROFILE DEBUG: Loading profile for user {user_id}
🔍 PROFILE DEBUG: Raw profile response: {..., "language": "en", ...}
```

**Verification Points**:
- [ ] Profile loads successfully
- [ ] Language field extracted from database
- [ ] Language defaults to 'en' if missing
- [ ] Cached profile includes language

### Test 3: Web Speech API Language Configuration
**Status**: Ready for Manual Test

**Test Steps**:
1. Open browser DevTools Console
2. Navigate to PAM chat at http://localhost:8080
3. Click voice input button (VoiceToggle)
4. Check SpeechRecognition configuration in console

**Expected Console Behavior**:
```javascript
// When useVoiceInput hook initializes:
SpeechRecognition.lang = "en-US" // or user's selected language
```

**Verification Points**:
- [ ] useUserSettings hook loads settings
- [ ] Language extracted from `settings?.display_preferences?.language`
- [ ] Fallback to 'en-US' if language not set
- [ ] SpeechRecognition API receives correct lang parameter

### Test 4: Voice Bridge Context Flow
**Status**: Ready for Manual Test

**Test Steps**:
1. Open PAM voice chat
2. Send a voice message via OpenAI Realtime
3. Check backend logs for context extraction

**Expected Backend Log**:
```python
🔗 Voice bridge connected for user {user_id}
# When message received:
user_language = context.get("language", "en")  # Should be 'en' or user's language
pam = await get_pam(user_id, user_language='en')
```

**Verification Points**:
- [ ] WebSocket connection established
- [ ] Message includes context object
- [ ] Language extracted from context
- [ ] PAM instance created with user_language parameter
- [ ] PAM's system prompt configured for user's language

### Test 5: End-to-End Language Switching
**Status**: Ready for Manual Test

**Test Steps**:
1. **Setup**: Update user's language preference in database
   ```sql
   UPDATE profiles SET language = 'es' WHERE id = '{user_id}';
   ```

2. **Test Voice Input**:
   - Open PAM chat
   - Click voice button
   - Speak in Spanish
   - Verify transcription accuracy

3. **Test PAM Response**:
   - PAM should respond in Spanish
   - Check backend logs for language configuration

4. **Test Language Switch**:
   - Change language to 'fr' in database
   - Refresh page
   - Verify French is used for voice and responses

**Expected Results**:
- [ ] Database update persists
- [ ] Profile cache refreshes on page load
- [ ] Web Speech API uses new language
- [ ] PAM responds in new language
- [ ] No errors in browser console
- [ ] No errors in backend logs

### Test 6: Multi-Language Support
**Status**: Ready for Manual Test

**Supported Languages to Test**:
- [ ] English (en) - Default
- [ ] Spanish (es)
- [ ] French (fr)
- [ ] German (de)
- [ ] Portuguese (pt)
- [ ] Italian (it)

**Test Each Language**:
1. Update database: `UPDATE profiles SET language = '{lang}' WHERE id = '{user_id}'`
2. Refresh PAM interface
3. Send voice message in that language
4. Verify accurate transcription
5. Verify PAM responds in same language

## Integration Verification

### Data Flow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ User Settings (Frontend)                                    │
│ settings?.display_preferences?.language                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├──────────────────────────────────┐
                  │                                  │
      ┌───────────▼─────────┐          ┌────────────▼────────┐
      │ VoiceToggle.tsx     │          │ Pam.tsx             │
      │ Web Speech API      │          │ Voice Service       │
      │ lang: userLanguage  │          │ language: lang      │
      └───────────┬─────────┘          └────────────┬────────┘
                  │                                  │
                  │                                  │
      ┌───────────▼─────────┐          ┌────────────▼────────┐
      │ useVoiceInput       │          │pamVoiceHybridService│
      │ SpeechRecognition   │          │context: {language}  │
      └─────────────────────┘          └────────────┬────────┘
                                                     │
                                       ┌─────────────▼─────────────┐
                                       │ WebSocket Message         │
                                       │ to Backend                │
                                       │ {type: 'user_message',    │
                                       │  context: {language:'en'}}│
                                       └─────────────┬─────────────┘
                                                     │
                                       ┌─────────────▼─────────────┐
                                       │pam_realtime_hybrid.py     │
                                       │Voice Bridge               │
                                       │user_language = context.get│
                                       └─────────────┬─────────────┘
                                                     │
                                       ┌─────────────▼─────────────┐
                                       │ get_pam(user_id,          │
                                       │   user_language=language) │
                                       └─────────────┬─────────────┘
                                                     │
                                       ┌─────────────▼─────────────┐
                                       │ PAM Instance              │
                                       │ Claude System Prompt      │
                                       │ "Respond in {language}"   │
                                       └───────────────────────────┘
```

### Cache Verification Flow
```
Database: profiles.language = 'en'
  ↓
LoadUserProfileTool.execute()
  ↓
Cache: enhanced_profile['language'] = 'en'
  ↓
PAM context includes language
  ↓
get_pam(user_id, user_language='en')
  ↓
System prompt: "Respond in English"
```

## Manual Testing Checklist

### Prerequisites
- [x] Dev server running (`npm run dev`) - http://localhost:8080
- [ ] Backend running (staging or local)
- [ ] User authenticated
- [ ] Browser DevTools open

### Voice Input Tests
- [ ] Click voice button - microphone access requested
- [ ] Speak English - accurate transcription
- [ ] Speak another language (after DB update) - accurate transcription
- [ ] Check browser console - no errors
- [ ] Check SpeechRecognition.lang value

### Backend Integration Tests
- [ ] Send voice message - WebSocket transmits
- [ ] Check backend logs - language extracted
- [ ] Verify PAM initialization - correct language parameter
- [ ] Check PAM response - correct language used
- [ ] Verify context object structure - includes all fields

### Error Handling Tests
- [ ] Missing language in profile - defaults to 'en'
- [ ] Invalid language code - validation catches
- [ ] Null/undefined language - fallback works
- [ ] WebSocket disconnection - reconnects preserving language
- [ ] Voice permission denied - graceful error

## Known Limitations

1. **Web Speech API Browser Support**:
   - Chrome/Edge: Full support for all languages
   - Safari: Limited language support
   - Firefox: Experimental support

2. **Language Detection**:
   - System does NOT auto-detect spoken language
   - User must manually set language preference
   - No real-time language switching during conversation

3. **Translation**:
   - System does NOT translate between languages
   - User speaks in X, PAM responds in X
   - Cross-language communication not supported

## Success Criteria

### All Tests Must Pass:
- [x] Database migration applied
- [ ] Profile tool extracts language
- [ ] Web Speech API configured correctly
- [ ] Voice bridge passes language to PAM
- [ ] Frontend sends language in context
- [ ] PAM responds in user's language
- [ ] Language switching works (DB update → refresh → new language)

### Performance Criteria:
- [ ] No increase in response latency
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Cache hit rate ≥ 90% for profile loads

### User Experience Criteria:
- [ ] Seamless language switching (no page refresh required ideally)
- [ ] Accurate voice transcription in all supported languages
- [ ] PAM responses natural and correct in each language

## Next Steps

1. **Complete manual testing** following checklist above
2. **Document test results** in this file
3. **Fix any issues** discovered during testing
4. **Create user documentation** for language switching
5. **Deploy to staging** for broader testing
6. **Deploy to production** after validation

## Files Modified Summary

**Backend (3 files)**:
- `docs/sql-fixes/add_language_to_profiles.sql` (new)
- `backend/app/services/pam/tools/load_user_profile.py` (modified)
- `backend/app/api/v1/pam_realtime_hybrid.py` (modified)

**Frontend (3 files)**:
- `src/services/pamVoiceHybridService.ts` (modified)
- `src/components/Pam.tsx` (modified)
- `src/components/pam/voice/VoiceToggle.tsx` (modified)

**Total Changes**:
- Lines added: ~30
- Lines modified: ~15
- New files: 1 (SQL migration)

## Git Status

**Branch**: staging
**Status**: All changes committed ✅
**Dev Server**: Running successfully at http://localhost:8080
**Build Status**: No errors

---

## Testing Instructions for Manual Tester

### Quick Start Test (5 minutes)

1. **Open the app**: Navigate to http://localhost:8080
2. **Login**: Use your test credentials
3. **Open PAM chat**: Click PAM assistant icon
4. **Test voice input**:
   - Click the microphone button
   - Grant permissions if prompted
   - Say "Hello PAM, what's the weather like?"
   - Verify transcription appears correctly
5. **Check browser console**: Should have no errors
6. **Check backend logs**: Should show language extraction

### Full Language Test (15 minutes)

1. **Test English (default)**:
   - Follow quick start steps above
   - Verify responses in English

2. **Test Spanish**:
   - Update database: `UPDATE profiles SET language = 'es' WHERE id = 'YOUR_USER_ID';`
   - Refresh page
   - Click voice button
   - Say "Hola PAM, ¿cómo está el clima?"
   - Verify Spanish transcription
   - Verify PAM responds in Spanish

3. **Test French**:
   - Update database: `UPDATE profiles SET language = 'fr' WHERE id = 'YOUR_USER_ID';`
   - Refresh page
   - Say "Bonjour PAM, quel temps fait-il?"
   - Verify French transcription and response

### What to Look For

✅ **Good Signs**:
- Voice button works
- Microphone permission requested
- Accurate transcription in selected language
- PAM responds in same language as user
- No console errors
- No backend errors

❌ **Bad Signs**:
- Voice button doesn't work
- Transcription in wrong language
- PAM responds in wrong language
- Console errors about SpeechRecognition
- Backend errors about language parameter
- WebSocket connection failures

### Reporting Results

Please document:
1. Which tests passed ✅
2. Which tests failed ❌
3. Error messages (if any)
4. Screenshots of issues
5. Browser used for testing
6. Backend logs during test

---

**Test Execution Date**: Pending
**Tester**: Pending
**Results**: Pending
