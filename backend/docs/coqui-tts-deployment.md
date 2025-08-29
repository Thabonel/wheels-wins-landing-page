# Coqui TTS Deployment Guide

## Overview
This guide covers deploying the Coqui TTS integration for natural voice quality in PAM assistant. Coqui TTS provides neural voice synthesis that sounds much more natural than Edge TTS.

## Architecture
- **Primary Engine**: Coqui TTS (neural voices)
- **Fallback Engine**: Edge TTS (robotic but reliable)
- **Final Fallback**: System TTS (pyttsx3)

## Dependencies Required

### Python Packages (already added to requirements.txt)
```python
# TTS Engines for high-quality voice synthesis
edge-tts==6.1.9                    # Microsoft Edge TTS (fallback - robotic)
TTS>=0.22.0                        # Coqui TTS (primary - neural voices)
soundfile>=0.12.1                  # Audio processing for Coqui TTS
```

### System Dependencies (Render.com)
Add to your Render.com build script or Dockerfile:
```bash
# Install system audio libraries
apt-get update
apt-get install -y libsndfile1 espeak-data espeak
```

## Configuration

### Environment Variables
Update your production environment with these settings:

```bash
# TTS Configuration - Neural Voice Quality
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=coqui
TTS_FALLBACK_ENABLED=true
TTS_CACHE_ENABLED=true
TTS_CACHE_TTL=86400
TTS_VOICE_DEFAULT=p225
TTS_QUALITY_THRESHOLD=0.8

# Coqui TTS Settings
TTS_COQUI_MODEL=tts_models/en/vctk/vits
TTS_COQUI_VOICE=p225
TTS_COQUI_SPEED=1.0
TTS_COQUI_EMOTION=neutral
```

### Available Coqui Voices
The system supports multiple high-quality voices:

**Female Voices:**
- `p225` - British female (young adult) - **DEFAULT**
- `p227` - British female (young adult)  
- `p228` - British female (young adult)
- `p229` - British female (young adult)

**Male Voices:**
- `p226` - British male (young adult)
- `p230` - British male (young adult)
- `p231` - British male (young adult)
- `p233` - British male (young adult)

**American Voices:**
- `p236` - American female (young adult)
- `p237` - American male (young adult)
- `p238` - American female (young adult)
- `p239` - American male (young adult)

## Memory Optimization for Cloud Deployment

### Render.com Configuration
To optimize memory usage on Render.com:

```python
# In your main.py startup event
@app.on_event("startup")
async def startup_event():
    # Initialize TTS with memory constraints
    import torch
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    # Limit model cache size
    import os
    os.environ["COQUI_MODEL_CACHE_SIZE"] = "1"  # Keep only 1 model in memory
```

### Memory Usage Estimates
- **Coqui VITS Model**: ~200-300MB RAM
- **Audio Processing**: ~50-100MB RAM  
- **Total Additional**: ~400MB RAM overhead

Ensure your Render.com plan has sufficient memory (recommend 1GB+ RAM).

## Model Download Process

### Automatic Download
Coqui TTS automatically downloads models on first use:
```python
# First synthesis triggers model download
tts = TTS(model_name="tts_models/en/vctk/vits")
# Downloads ~200MB model to ~/.local/share/tts/
```

### Pre-warming Models
To avoid cold start delays, add to startup:
```python
# Pre-warm the TTS model during startup
await tts_service.initialize()
```

## Testing the Integration

### Local Testing
```bash
# Test Coqui TTS directly
python -c "
from TTS.api import TTS
tts = TTS(model_name='tts_models/en/vctk/vits')
tts.tts_to_file(text='Hello, this is PAM with natural voice!', 
                speaker='p225', 
                file_path='test_voice.wav')
"
```

### API Testing
```bash
# Test through PAM API
curl -X POST "http://localhost:8000/api/v1/pam/voice" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, I am PAM with natural voice quality!"}'
```

## Troubleshooting

### Common Issues

**1. Model Download Fails**
```bash
# Clear model cache and retry
rm -rf ~/.local/share/tts/
python -c "from TTS.api import TTS; TTS(model_name='tts_models/en/vctk/vits')"
```

**2. Memory Issues on Render.com**
```python
# Add to environment variables
COQUI_MODEL_CACHE_SIZE=1
TORCH_NUM_THREADS=2
OMP_NUM_THREADS=2
```

**3. Audio Library Missing**
```bash
# Install system dependencies
apt-get install libsndfile1-dev
pip install soundfile
```

**4. Fallback to Edge TTS**
Check logs for Coqui initialization errors:
```python
logger.info("✅ coqui TTS engine initialized: True")  # Success
logger.info("✅ coqui TTS engine initialized: False") # Failed, using fallback
```

## Performance Optimization

### Caching Strategy
- **24-hour cache**: Voice files cached for fast replay
- **Model persistence**: Keep models in memory between requests
- **Smart fallback**: Automatic degradation for reliability

### Response Times
- **First Request**: 3-5 seconds (model loading)
- **Cached Response**: <100ms
- **Subsequent Requests**: 1-2 seconds

## Quality Comparison

### Voice Quality Metrics
- **Edge TTS**: Robotic, fast, reliable
- **Coqui TTS**: Natural, human-like, emotional
- **System TTS**: Basic, varies by OS

### User Experience Impact
- **Before**: "PAM sounds robotic"
- **After**: "PAM sounds natural and engaging"

## Deployment Checklist

- [ ] Add Coqui TTS dependencies to requirements.txt ✅
- [ ] Update environment variables in production
- [ ] Configure memory limits for cloud deployment
- [ ] Add system dependencies for audio processing
- [ ] Test voice synthesis in production environment
- [ ] Monitor memory usage and performance
- [ ] Set up fallback monitoring alerts

## Monitoring

### Key Metrics to Track
- TTS response times
- Memory usage during synthesis
- Fallback engine usage rate
- Voice quality user feedback

### Log Messages to Monitor
```bash
# Success indicators
"✅ coqui TTS engine initialized: True"  
"🔊 Using coqui TTS for synthesis"

# Fallback indicators  
"⚠️ Coqui TTS failed, using Edge TTS fallback"
"⚠️ All TTS engines failed"
```

## Next Steps

1. **Deploy**: Update production environment variables
2. **Test**: Verify voice quality improvement  
3. **Monitor**: Track performance and fallback rates
4. **Optimize**: Fine-tune memory usage based on metrics
5. **Scale**: Consider voice customization features

The Coqui TTS integration will significantly improve PAM's voice quality, making conversations more natural and engaging for users.