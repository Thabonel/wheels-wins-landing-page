# TTS Voice Quality Improvement Guide

## Current Issue
PAM's voice sounds robotic because Coqui TTS (neural voice engine) is not available due to Python 3.12 incompatibility. The system falls back to Edge TTS which, while reliable, produces more robotic-sounding voices.

## Immediate Solution: Optimize Edge TTS Voices

### 1. Update Voice Configuration
Since Coqui TTS requires Python < 3.12 and you're using Python 3.12.7, let's optimize Edge TTS voices for better quality:

```python
# Update backend/app/core/user_config.py
TTS_PRIMARY_ENGINE: str = "edge"  # Use Edge TTS explicitly
TTS_VOICE_DEFAULT: str = "en-US-JennyNeural"  # Most natural Edge voice
```

### 2. Best Edge TTS Voices (Natural Sounding)
**Female Voices (Most Natural):**
- `en-US-JennyNeural` - Casual, conversational (BEST)
- `en-US-AriaNeural` - Professional, clear
- `en-US-AnaNeural` - Young, friendly
- `en-GB-SoniaNeural` - British, warm

**Male Voices:**
- `en-US-GuyNeural` - Clear, friendly
- `en-US-DavisNeural` - Professional
- `en-GB-RyanNeural` - British accent

### 3. Render.com Deployment for Coqui TTS

To enable Coqui TTS in production, create a custom Dockerfile:

```dockerfile
# render.dockerfile
FROM python:3.11-slim

# Install system dependencies for audio
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    espeak-data \
    espeak \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4. Update Render.com Build Command
In your Render.com service settings:
- **Build Command**: `docker build -t pam-backend -f render.dockerfile .`
- **Runtime**: Docker
- **Environment Variables**: Add all existing plus:
  ```
  TTS_PRIMARY_ENGINE=coqui
  TTS_COQUI_MODEL=tts_models/en/vctk/vits
  TTS_COQUI_VOICE=p225
  ```

## Quick Fix for Development

### Option A: Use Better Edge TTS Configuration
```python
# backend/app/services/tts/enhanced_tts_service.py
# Update line 520 to prioritize Edge with better voice
self.fallback_chain = [TTSEngine.EDGE, TTSEngine.SYSTEM]

# Update default voice in Edge TTS Engine
voice_id = "en-US-JennyNeural"  # Instead of AriaNeural
```

### Option B: Create Python 3.11 Virtual Environment
```bash
# Install Python 3.11 with pyenv
pyenv install 3.11.9
pyenv local 3.11.9

# Create virtual environment
python -m venv venv311
source venv311/bin/activate  # On Windows: venv311\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

## Voice Quality Comparison

| Engine | Voice Quality | Speed | Reliability | Cost |
|--------|--------------|-------|-------------|------|
| Coqui TTS | ⭐⭐⭐⭐⭐ Natural | Medium | Good | Free |
| Edge TTS (Jenny) | ⭐⭐⭐⭐ Good | Fast | Excellent | Free |
| Edge TTS (Aria) | ⭐⭐⭐ Robotic | Fast | Excellent | Free |
| System TTS | ⭐⭐ Basic | Very Fast | Excellent | Free |

## Testing Voice Quality

### 1. Test Edge TTS Voices Locally
```python
# test_voices.py
import asyncio
import edge_tts

async def test_voice(text, voice):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(f"test_{voice}.mp3")
    print(f"Generated: test_{voice}.mp3")

async def main():
    text = "Hello! I'm PAM, your AI travel assistant. How can I help you plan your next adventure?"
    voices = [
        "en-US-JennyNeural",  # Best
        "en-US-AriaNeural",   # Current
        "en-US-AnaNeural",    # Alternative
    ]
    
    for voice in voices:
        await test_voice(text, voice)

asyncio.run(main())
```

### 2. Test API with New Voice
```bash
curl -X POST "http://localhost:8000/api/v1/pam/voice" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Hello! This is PAM with improved voice quality.",
    "voice_id": "en-US-JennyNeural"
  }'
```

## Monitoring Voice Quality

Add to your monitoring:
```python
# Track which TTS engine is being used
logger.info(f"TTS Engine Used: {response.engine.value}")
logger.info(f"Voice Quality: {response.quality.value}")
logger.info(f"Voice ID: {response.voice_id}")
```

## User Feedback Integration

Consider adding voice quality feedback:
```typescript
// Frontend component
const VoiceQualityFeedback = () => {
  const [rating, setRating] = useState(0);
  
  const submitFeedback = async () => {
    await api.post('/api/v1/pam/voice/feedback', {
      rating,
      voice_id: currentVoiceId,
      engine: currentEngine
    });
  };
  
  return (
    <div>
      <p>How natural did PAM's voice sound?</p>
      <StarRating value={rating} onChange={setRating} />
      <button onClick={submitFeedback}>Submit</button>
    </div>
  );
};
```

## Summary

1. **Immediate Fix**: Switch to `en-US-JennyNeural` for Edge TTS
2. **Production Fix**: Deploy with Python 3.11 Docker container
3. **Long-term**: Implement voice quality monitoring and user feedback

The robotic voice issue is due to Python 3.12 incompatibility with Coqui TTS, causing fallback to Edge TTS with a professional but robotic voice (AriaNeural). Switching to JennyNeural or deploying with Python 3.11 will significantly improve voice quality.