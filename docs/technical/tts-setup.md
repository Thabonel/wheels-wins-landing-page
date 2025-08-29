# Text-to-Speech (TTS) Configuration Guide

## Overview
Wheels & Wins implements a comprehensive multi-engine TTS system for the PAM AI assistant, providing voice synthesis capabilities with robust fallback chains to ensure reliability across different platforms and environments.

## TTS Architecture

### 🎙️ Multi-Engine Design
The TTS system implements a hierarchical fallback chain:

1. **Edge TTS** (Primary) - Microsoft's cloud-based TTS
2. **Coqui TTS** (Secondary) - Open-source local TTS
3. **pyttsx3** (Tertiary) - System TTS wrapper
4. **System TTS** (Fallback) - Platform-native TTS

### 📁 File Structure
```
backend/app/services/tts/
├── __init__.py
├── base_tts.py              # Base classes and interfaces
├── tts_service.py           # Main TTS service orchestrator
├── streaming_tts.py         # Streaming TTS implementation
├── edge_tts_engine.py       # Microsoft Edge TTS
├── coqui_tts_engine.py      # Coqui TTS implementation
├── pyttsx3_engine.py        # System TTS wrapper
└── cache/                   # TTS cache management
    ├── tts_cache.py
    └── cleanup.py
```

## Installation & Setup

### 🔧 Automated Setup
Run the comprehensive TTS setup script:

```bash
cd backend
python setup_tts.py
```

This script will:
- Install required TTS dependencies
- Test all available TTS engines
- Configure fallback chain
- Validate system compatibility
- Generate configuration recommendations

### 📦 Manual Installation

#### Core Dependencies
```bash
# Edge TTS (Recommended)
pip install edge-tts

# Audio processing
pip install soundfile

# System TTS
pip install pyttsx3

# Optional: Coqui TTS (requires Python < 3.12)
pip install TTS
```

#### Platform-Specific Requirements

##### macOS
```bash
# Built-in 'say' command (no additional setup)
which say  # Should return /usr/bin/say
```

##### Linux
```bash
# Install espeak for system TTS
sudo apt-get install espeak espeak-data

# Optional: Additional voices
sudo apt-get install espeak-data-*
```

##### Windows
```bash
# PowerShell TTS (built-in, no setup required)
# Optional: Install additional voice packs
```

## Configuration

### 🔧 Environment Variables
Add to `backend/.env`:

```bash
# TTS Engine Settings
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_FALLBACK_ENABLED=true
TTS_CACHE_ENABLED=true
TTS_CACHE_TTL=86400

# Voice Settings
TTS_VOICE_DEFAULT=en-US-AriaNeural
TTS_QUALITY_THRESHOLD=0.7
TTS_MAX_TEXT_LENGTH=5000
TTS_RATE_LIMIT=10

# Optional: Coqui TTS Model Path
# TTS_MODEL_PATH=path/to/your/model
```

### ⚙️ Backend Configuration
The TTS service is configured in `backend/app/core/config.py`:

```python
class Settings(BaseSettings):
    # TTS Configuration
    TTS_ENABLED: bool = True
    TTS_PRIMARY_ENGINE: str = "edge"
    TTS_FALLBACK_ENABLED: bool = True
    TTS_CACHE_ENABLED: bool = True
    TTS_CACHE_TTL: int = 86400  # 24 hours
    TTS_VOICE_DEFAULT: str = "en-US-AriaNeural"
    TTS_QUALITY_THRESHOLD: float = 0.7
    TTS_MAX_TEXT_LENGTH: int = 5000
    TTS_RATE_LIMIT: int = 10  # Requests per minute per user
```

## TTS Engines

### 🌐 Edge TTS (Primary Engine)

#### Features
- **High Quality**: Natural-sounding voices
- **Multiple Languages**: 200+ voices in 40+ languages
- **No API Key Required**: Free Microsoft service
- **Fast Processing**: Cloud-based synthesis

#### Available Voices
```python
# Popular English voices
EDGE_VOICES = {
    "en-US-AriaNeural": "Female, clear and professional",
    "en-US-JennyNeural": "Female, friendly and conversational", 
    "en-US-GuyNeural": "Male, clear and neutral",
    "en-US-DavisNeural": "Male, authoritative",
    "en-GB-SoniaNeural": "Female, British accent",
    "en-AU-NatashaNeural": "Female, Australian accent"
}
```

#### Configuration
```python
# Edge TTS configuration
EDGE_TTS_CONFIG = {
    "voice": "en-US-AriaNeural",
    "rate": "+0%",        # Speech rate
    "volume": "+0%",      # Volume level
    "pitch": "+0Hz"       # Pitch adjustment
}
```

### 🏠 Coqui TTS (Local Engine)

#### Features
- **Privacy**: Local processing, no cloud dependency
- **Customizable**: Train custom voices
- **Open Source**: Community-driven development
- **High Quality**: Neural network-based synthesis

#### Installation Notes
- **Python Version**: Requires Python < 3.12
- **Model Size**: Models can be 100MB+ 
- **GPU Support**: CUDA acceleration available
- **Memory Usage**: 2-4GB RAM recommended

#### Model Configuration
```python
# Coqui TTS model configuration
COQUI_CONFIG = {
    "model_name": "tts_models/en/ljspeech/tacotron2-DDC",
    "vocoder_name": "vocoder_models/en/ljspeech/multiband-melgan",
    "use_cuda": False,  # Enable for GPU acceleration
    "speaker_idx": None,
    "emotion": "neutral"
}
```

### 🔧 pyttsx3 (System TTS)

#### Features
- **Cross-Platform**: Windows, macOS, Linux support
- **Offline**: No internet required
- **Lightweight**: Minimal resource usage
- **Reliable**: System-integrated TTS

#### Platform Implementation
```python
# Platform-specific TTS engines
SYSTEM_ENGINES = {
    "Windows": "sapi5",    # Microsoft Speech API
    "Darwin": "nsss",      # macOS Speech Synthesis
    "Linux": "espeak"      # eSpeak TTS engine
}
```

### 🖥️ System TTS (Fallback)

#### Direct System Commands

##### macOS
```python
def macos_tts(text: str) -> bool:
    try:
        subprocess.run(["say", text], check=True)
        return True
    except subprocess.CalledProcessError:
        return False
```

##### Linux
```python
def linux_tts(text: str) -> bool:
    try:
        subprocess.run(["espeak", text], check=True)
        return True
    except subprocess.CalledProcessError:
        return False
```

##### Windows
```python
def windows_tts(text: str) -> bool:
    try:
        # PowerShell TTS command
        ps_command = f'Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("{text}")'
        subprocess.run(["powershell", "-Command", ps_command], check=True)
        return True
    except subprocess.CalledProcessError:
        return False
```

## Usage Examples

### 🔌 Basic TTS Usage

#### Initialize TTS Service
```python
from app.services.tts.tts_service import tts_service

# Initialize the service
await tts_service.initialize()
```

#### Synthesize Speech
```python
# Basic synthesis
response = await tts_service.synthesize_for_pam(
    text="Hello! Welcome to Wheels and Wins.",
    user_id="user123",
    context="greeting"
)

# With voice preference
response = await tts_service.synthesize_for_pam(
    text="Your trip route has been calculated.",
    user_id="user123",
    context="trip_planning",
    voice_preference="en-US-GuyNeural"
)
```

#### Voice Management
```python
# Get available voices
voices = await tts_service.get_available_voices(user_id="user123")

# Set user voice preference
await tts_service.set_user_voice_preference(
    user_id="user123",
    voice_data={
        "voice_id": "en-US-AriaNeural",
        "name": "Aria",
        "settings": {
            "speed": 1.0,
            "pitch": 1.0,
            "volume": 1.0
        }
    },
    context="general_conversation",
    is_default=True
)
```

### 🎛️ Advanced Configuration

#### Custom Voice Profiles
```python
from app.services.tts.base_tts import VoiceProfile, VoiceSettings, VoiceStyle

# Create custom voice profile
voice_profile = VoiceProfile(
    voice_id="en-US-AriaNeural",
    name="PAM Assistant Voice",
    gender="female",
    age="adult",
    accent="american",
    language="en",
    engine=TTSEngine.EDGE,
    settings=VoiceSettings(
        stability=0.75,
        similarity_boost=0.75,
        speed=1.1,
        pitch=1.0,
        volume=1.0,
        style=VoiceStyle.FRIENDLY
    )
)
```

#### Context-Aware TTS
```python
# Different voices for different contexts
CONTEXT_VOICES = {
    "professional": "en-US-DavisNeural",    # Male, authoritative
    "casual": "en-US-JennyNeural",          # Female, conversational
    "navigation": "en-US-AriaNeural",       # Female, clear
    "emergency": "en-US-GuyNeural"          # Male, clear and urgent
}
```

## Performance & Optimization

### 📊 Performance Metrics

#### Response Times (Average)
- **Edge TTS**: 500-1500ms (network dependent)
- **Coqui TTS**: 1000-3000ms (hardware dependent)
- **pyttsx3**: 100-500ms (system dependent)
- **System TTS**: 50-200ms (near-instant)

#### Quality Comparison
| Engine | Quality | Speed | Offline | Voices |
|--------|---------|-------|---------|--------|
| Edge TTS | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | 200+ |
| Coqui TTS | ⭐⭐⭐⭐ | ⭐⭐ | ✅ | Custom |
| pyttsx3 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | System |
| System TTS | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | Limited |

### 🚀 Optimization Strategies

#### Caching
```python
# TTS response caching
CACHE_CONFIG = {
    "enabled": True,
    "ttl": 86400,  # 24 hours
    "max_size": "100MB",
    "compression": True,
    "cleanup_interval": 3600  # 1 hour
}
```

#### Preprocessing
```python
def optimize_text_for_tts(text: str) -> str:
    """Optimize text for better TTS synthesis"""
    # Remove excessive punctuation
    text = re.sub(r'[.]{3,}', '...', text)
    
    # Expand abbreviations
    abbreviations = {
        "RV": "recreational vehicle",
        "GPS": "G P S",
        "MPG": "miles per gallon"
    }
    
    for abbr, expansion in abbreviations.items():
        text = text.replace(abbr, expansion)
    
    # Add appropriate pauses
    text = text.replace('. ', '. <break time="500ms"/> ')
    
    return text
```

## Troubleshooting

### 🐛 Common Issues

#### Edge TTS Problems
```python
# Check internet connectivity
async def test_edge_tts():
    try:
        import edge_tts
        communicate = edge_tts.Communicate("Test", "en-US-AriaNeural")
        await communicate.save("test.mp3")
        return True
    except Exception as e:
        logger.error(f"Edge TTS test failed: {e}")
        return False
```

#### Coqui TTS Issues
- **Python Version**: Ensure Python < 3.12
- **Dependencies**: Install torch, numpy, librosa
- **Memory**: Ensure sufficient RAM (2GB+)
- **Models**: Download required model files

#### System TTS Problems
```python
# Diagnose system TTS availability
def diagnose_system_tts():
    import platform
    system = platform.system()
    
    if system == "Darwin":
        # Check macOS 'say' command
        result = subprocess.run(["which", "say"], capture_output=True)
        return result.returncode == 0
    
    elif system == "Linux":
        # Check espeak installation
        result = subprocess.run(["which", "espeak"], capture_output=True)
        return result.returncode == 0
    
    elif system == "Windows":
        # Windows has built-in TTS
        return True
    
    return False
```

### 🔧 Debug Commands

#### Test TTS Engines
```bash
# Run TTS diagnostics
cd backend
python -c "
from app.services.tts.tts_service import tts_service
import asyncio
asyncio.run(tts_service.initialize())
"

# Test specific engine
python -c "
import edge_tts
import asyncio

async def test():
    communicate = edge_tts.Communicate('Hello World', 'en-US-AriaNeural')
    await communicate.save('test.wav')

asyncio.run(test())
"
```

#### Monitor TTS Performance
```python
# TTS performance monitoring
import time

def monitor_tts_performance(text: str, engine: str):
    start_time = time.time()
    
    # Synthesize speech
    result = synthesize_speech(text, engine)
    
    end_time = time.time()
    duration = end_time - start_time
    
    logger.info(f"TTS Performance - Engine: {engine}, Duration: {duration:.2f}s, Text Length: {len(text)}")
    
    return result, duration
```

## Security Considerations

### 🔒 Privacy Protection
- **Local Processing**: Prefer local engines for sensitive content
- **Data Encryption**: Encrypt cached TTS files
- **Rate Limiting**: Prevent TTS abuse
- **Input Sanitization**: Clean text before synthesis

### 🛡️ Security Best Practices
```python
def sanitize_tts_input(text: str) -> str:
    """Sanitize text input for TTS"""
    # Remove potential injection attempts
    text = re.sub(r'<[^>]+>', '', text)  # Remove XML/HTML tags
    
    # Limit text length
    if len(text) > TTS_MAX_TEXT_LENGTH:
        text = text[:TTS_MAX_TEXT_LENGTH] + "..."
    
    # Remove control characters
    text = ''.join(char for char in text if char.isprintable() or char.isspace())
    
    return text.strip()
```

## Future Enhancements

### 🔮 Planned Features
- **Voice Cloning**: Custom voice training
- **Real-time TTS**: Streaming synthesis
- **Emotion Control**: Emotional voice synthesis
- **Multi-language**: Dynamic language detection
- **Voice Analytics**: Usage and quality metrics

### 📈 Performance Goals
- **Sub-second Synthesis**: Target < 1s for short text
- **Quality Improvement**: Neural voice enhancement
- **Offline Capability**: Enhanced local processing
- **Resource Optimization**: Reduced memory usage

---

The TTS system provides robust voice synthesis capabilities with multiple fallback options, ensuring reliable operation across different platforms and network conditions.