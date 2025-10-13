# PAM 2.0 Frontend Integration Guide
===================================

## 🎯 Overview

This guide explains how to integrate the existing frontend with the new PAM 2.0 backend for testing and eventual production deployment.

## 🔄 Backend API Changes

### New Enhanced Endpoints

PAM 2.0 adds enhanced endpoints while maintaining compatibility with existing API:

#### Core API (Unchanged)
- `POST /api/v1/chat` - Basic chat functionality
- `GET /api/v1/health` - Basic health check
- `WS /api/v1/ws/{user_id}` - WebSocket connections

#### Enhanced API (New)
- `POST /api/v1/enhanced/voice/synthesize` - Text-to-speech
- `POST /api/v1/enhanced/voice/transcribe` - Speech-to-text
- `GET /api/v1/enhanced/voice/stream/{text}` - Streaming audio
- `POST /api/v1/enhanced/mcp/execute` - Execute MCP tools
- `GET /api/v1/enhanced/mcp/tools` - List available tools
- `POST /api/v1/enhanced/intelligent/chat` - Advanced AI chat
- `POST /api/v1/enhanced/intelligent/multimodal` - Multimodal processing
- `GET /api/v1/enhanced/health` - Enhanced health check
- `GET /api/v1/enhanced/metrics` - Service metrics

## 🔧 Frontend Integration Steps

### Step 1: Environment Configuration

Update staging environment to use PAM2:

```bash
# Copy PAM2 staging environment
cp .env.staging.pam2 .env.staging

# Or manually update:
VITE_API_BASE_URL=https://pam2-backend-staging.onrender.com
VITE_PAM2_VOICE_ENABLED=true
VITE_PAM2_MCP_ENABLED=true
VITE_PAM2_ADVANCED_FEATURES_ENABLED=true
```

### Step 2: Update PAM Service Client

The existing PAM service should work with PAM2 without changes for basic functionality:

```typescript
// src/services/pamService.ts - No changes needed for basic chat
const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id, message })
});
```

### Step 3: Add Enhanced Features (Optional)

For enhanced features, add new service methods:

```typescript
// Enhanced voice synthesis
export const synthesizeVoice = async (text: string, userId: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/enhanced/voice/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, user_id: userId })
  });
  return response.json();
};

// Enhanced intelligent chat
export const intelligentChat = async (text: string, userId: string, context?: any) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/enhanced/intelligent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, user_id: userId, context_data: context })
  });
  return response.json();
};
```

## 🧪 Testing Strategy

### Phase 1: Basic Compatibility Test

1. **Deploy PAM2 backend** to staging
2. **Update frontend environment** to point to PAM2
3. **Test existing PAM functionality**:
   - Chat conversations
   - WebSocket connections
   - Authentication flow
   - File upload/download
   - Trip planning features
   - Financial features

### Phase 2: Enhanced Features Test

1. **Test voice features** (if UI exists):
   - Text-to-speech synthesis
   - Speech recognition
   - Audio streaming

2. **Test intelligent features**:
   - Enhanced chat responses
   - Proactive suggestions
   - Personality adaptation

### Phase 3: Performance Testing

1. **Response times**: Should be <200ms (same as original)
2. **WebSocket stability**: No disconnection issues
3. **Error handling**: Proper fallbacks and error messages

## 🔄 Gradual Migration Strategy

### Option 1: Direct Replacement (Recommended for Staging)

```bash
# Update staging environment
VITE_API_BASE_URL=https://pam2-backend-staging.onrender.com

# Deploy to staging
git push origin feature/pam2-staging-deployment:staging
```

### Option 2: Feature Flag Approach

```typescript
// Use environment variable to toggle between backends
const usesPAM2 = import.meta.env.VITE_PAM2_ENABLED === 'true';
const apiBaseUrl = usesPAM2
  ? 'https://pam2-backend-staging.onrender.com'
  : 'https://wheels-wins-backend-staging.onrender.com';
```

### Option 3: A/B Testing

```typescript
// Route percentage of users to PAM2
const userId = getCurrentUserId();
const usesPAM2 = hashUserId(userId) % 100 < 50; // 50% of users
```

## 🎨 UI Enhancements (Optional)

### Voice Interface

```typescript
// Add voice button to chat interface
const VoiceButton = ({ onVoiceMessage }: { onVoiceMessage: (text: string) => void }) => {
  const [isRecording, setIsRecording] = useState(false);

  const handleVoiceInput = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob);

    const response = await fetch(`${API_BASE_URL}/api/v1/enhanced/voice/transcribe`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    onVoiceMessage(result.text);
  };

  return (
    <button onClick={() => setIsRecording(!isRecording)}>
      {isRecording ? '🛑 Stop' : '🎤 Voice'}
    </button>
  );
};
```

### Enhanced Chat Interface

```typescript
// Display proactive suggestions
const ProactiveSuggestions = ({ suggestions }: { suggestions: any[] }) => {
  return (
    <div className="suggestions">
      {suggestions.map(suggestion => (
        <div key={suggestion.id} className="suggestion-card">
          <h4>{suggestion.title}</h4>
          <p>{suggestion.description}</p>
          {suggestion.estimated_value && (
            <span className="value">💰 {suggestion.estimated_value}</span>
          )}
        </div>
      ))}
    </div>
  );
};
```

## 🚨 Rollback Plan

If PAM2 integration causes issues:

### Quick Rollback (1 minute)
```bash
# Update environment back to original backend
VITE_API_BASE_URL=https://wheels-wins-backend-staging.onrender.com

# Redeploy staging
git push origin staging
```

### Full Rollback (5 minutes)
```bash
# Switch back to previous branch
git checkout staging
git reset --hard origin/staging
git push --force-with-lease origin staging
```

## ✅ Success Criteria

PAM2 frontend integration is successful when:

- ✅ All existing PAM functionality works unchanged
- ✅ WebSocket connections are stable
- ✅ Response times are comparable (<200ms average)
- ✅ No authentication or CORS issues
- ✅ Error handling works correctly
- ✅ Mobile interface remains responsive
- ✅ Enhanced features work (if implemented)

## 📊 Monitoring

Monitor these metrics after deployment:

- **Response Times**: Average API response time
- **Error Rates**: 4xx/5xx error percentages
- **WebSocket Uptime**: Connection stability
- **User Experience**: Chat completion rates
- **Enhanced Features**: Usage of new endpoints

---

🎉 **Ready for PAM 2.0 Frontend Integration!**