# PAM Voice Device Implementation Guide

## ReSpeaker Lite Voice Assistant Kit Integration

**Hardware:** ReSpeaker Lite Kit with XIAO ESP32S3  
**Platform:** Wheels & Wins  
**AI Agent:** PAM (Personal AI Manager)  
**Version:** 1.0 | January 2026

---

## Table of Contents

1. [Overview and Architecture](#1-overview-and-architecture)
2. [What You Need](#2-what-you-need)
3. [Pre-Arrival Preparation (Do This Now)](#3-pre-arrival-preparation-do-this-now)
   - 3.1 Create Picovoice Account and Wake Word
   - 3.2 Set Up Development Environment
   - 3.3 Build the PAM Voice API Endpoint
   - 3.4 Test Your API Endpoint
4. [When the Device Arrives](#4-when-the-device-arrives)
   - 4.1 Unbox and Inspect
   - 4.2 Update Firmware
   - 4.3 Flash Custom PAM Firmware
5. [Testing and Debugging](#5-testing-and-debugging)
6. [Production Deployment Checklist](#6-production-deployment-checklist)
7. [Troubleshooting Guide](#7-troubleshooting-guide)
8. [Quick Reference Card](#8-quick-reference-card)

---

## 1. Overview and Architecture

This guide walks you through creating a dedicated, always-on voice assistant device for PAM. When complete, users can simply say "Hey Pam" and interact with your Wheels & Wins platform without opening a browser or app.

### System Architecture

```
VOICE FLOW ARCHITECTURE
═══════════════════════════════════════════════════════════════

1. User says "Hey Pam, what's the weather in Cairns?"
2. XMOS chip processes audio (noise cancellation)
3. ESP32S3 detects wake word locally (Picovoice)
4. Device records 3-5 seconds of audio
5. HTTP POST audio to PAM backend API
6. Backend: STT → PAM Logic → TTS
7. Device plays audio response through speaker

═══════════════════════════════════════════════════════════════
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **XMOS XU316** | AI audio chip - handles noise cancellation, echo cancellation, and audio processing in hardware |
| **ESP32-S3** | Main processor - runs wake word detection, WiFi connectivity, and sends audio to your API |
| **Picovoice Porcupine** | Wake word engine - detects "Hey Pam" locally on the device (no cloud needed) |
| **PAM Voice API** | Your backend endpoint - receives audio, runs STT, processes with PAM, returns TTS audio |

---

## 2. What You Need

### Hardware (On Order)

- ☐ ReSpeaker Lite Voice Assistant Kit with XIAO ESP32S3 (SKU: SS110061601)
- ☐ USB-C cable for power and programming
- ☐ Computer with USB port (Windows, Mac, or Linux)

### Accounts Required (Free Tiers Available)

- ☐ **Picovoice Console** (console.picovoice.ai) - for wake word creation
- ☐ Your existing Wheels & Wins backend access

### Software to Install

- ☐ **Arduino IDE 2.x** (arduino.cc/en/software)
- ☐ **ESP32 Board Support** (installed via Arduino)
- ☐ **CP210x USB Driver** (if on Windows - silabs.com/developers/usb-to-uart-bridge-vcp-drivers)

### Estimated Time

| Task | Time |
|------|------|
| Pre-arrival preparation | 2-4 hours |
| Hardware setup when device arrives | 30-60 minutes |
| Firmware flashing and testing | 1-2 hours |
| **TOTAL** | **4-7 hours** |

---

## 3. Pre-Arrival Preparation (Do This Now)

Complete these tasks before your ReSpeaker Lite arrives. This will dramatically speed up the integration process.

### 3.1 Create Picovoice Account and Wake Word

Picovoice provides the wake word detection that runs locally on the device. Their free tier is sufficient for development and small-scale deployment.

**Steps:**

1. Go to **console.picovoice.ai** and create a free account
2. Click **"Porcupine"** in the left sidebar (this is their wake word engine)
3. Click **"Train Custom Wake Word"**
4. Enter wake word: **Hey Pam**
5. Select platform: **ESP32**
6. Click **"Train"** - training takes about 30 seconds
7. Download the **.ppn file** (this is your wake word model)
8. Copy your **Access Key** from the console (you'll need this in the firmware)

> 💡 **TIP:** Test your wake word in the browser first using their web demo to ensure it responds well to your voice.

> ⚠️ **IMPORTANT:** Save both the .ppn file and your Access Key somewhere safe. You will need both when programming the device.

---

### 3.2 Set Up Development Environment

#### Install Arduino IDE

1. Download Arduino IDE 2.x from **arduino.cc/en/software**
2. Install and launch Arduino IDE

#### Add ESP32 Board Support

1. Open **File > Preferences**
2. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Click OK
4. Open **Tools > Board > Boards Manager**
5. Search for "esp32" and install **"esp32 by Espressif Systems"**

#### Install Required Libraries

Open **Sketch > Include Library > Manage Libraries** and install:

- **Picovoice_EN** (by Picovoice) - wake word detection
- **ESP32-audioI2S** (by schreibfaul1) - audio recording and playback
- **ArduinoJson** (by Benoit Blanchon) - JSON parsing
- **WiFi** (built-in with ESP32 board support)
- **HTTPClient** (built-in with ESP32 board support)

#### Install USB Driver (Windows Only)

If you're on Windows, download and install the CP210x driver from:
```
silabs.com/developers/usb-to-uart-bridge-vcp-drivers
```

Mac and Linux typically don't need additional drivers.

---

### 3.3 Build the PAM Voice API Endpoint

This is the most critical pre-arrival task. Your backend needs an endpoint that accepts audio from the device and returns audio responses.

#### API Specification

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /api/pam/voice` |
| **Content-Type** | `audio/wav` |
| **Request Body** | Raw WAV audio bytes (16kHz, 16-bit, mono) |
| **Response Type** | `audio/mpeg` (MP3) or `audio/wav` |
| **Optional Header** | `X-Device-ID: unique device identifier` |

#### Backend Processing Flow

1. **Receive WAV audio** from the device via HTTP POST

2. **Speech-to-Text (STT)** - Convert audio to text using:
   - OpenAI Whisper API (recommended - best accuracy)
   - Deepgram (fast, good for real-time)
   - Google Cloud Speech-to-Text

3. **Process with PAM** - Send transcribed text to your existing PAM logic

4. **Text-to-Speech (TTS)** - Convert PAM's response to audio using:
   - OpenAI TTS (natural sounding, recommended)
   - ElevenLabs (very natural, custom voices)
   - Google Cloud TTS

5. **Return audio** - Stream MP3/WAV back to device

> ⚠️ **IMPORTANT:** The device has limited memory. Keep response audio under 30 seconds and use MP3 format (smaller file size) when possible.

#### Example Python Backend (FastAPI)

```python
from fastapi import FastAPI, Request, Response
import openai
import io

app = FastAPI()

@app.post("/api/pam/voice")
async def pam_voice(request: Request):
    # 1. Get audio from request
    audio_bytes = await request.body()
    
    # 2. Speech-to-Text (using OpenAI Whisper)
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.wav"
    
    transcript = openai.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file
    )
    user_text = transcript.text
    
    # 3. Process with PAM (your existing logic)
    pam_response = await process_with_pam(user_text)
    
    # 4. Text-to-Speech (using OpenAI TTS)
    speech_response = openai.audio.speech.create(
        model="tts-1",
        voice="nova",  # or alloy, echo, fable, onyx, shimmer
        input=pam_response
    )
    
    # 5. Return audio
    return Response(
        content=speech_response.content,
        media_type="audio/mpeg"
    )

async def process_with_pam(user_text: str) -> str:
    # Your existing PAM logic here
    # Return the text response that should be spoken
    pass
```

---

### 3.4 Test Your API Endpoint

Before the device arrives, thoroughly test your API endpoint using command-line tools.

#### Create a Test Audio File

Record a short WAV file saying something like "What's the weather in Cairns?" using:
- Your phone's voice recorder (export as WAV)
- Audacity (free audio editor)
- Any online WAV recorder

#### Test with cURL

```bash
curl -X POST https://your-api.com/api/pam/voice \
  -H "Content-Type: audio/wav" \
  --data-binary @test-audio.wav \
  --output response.mp3
```

#### Expected Results

- ✅ HTTP 200 response
- ✅ response.mp3 file is created and playable
- ✅ Audio contains PAM's spoken response to your question

#### Measure Response Time

The total round-trip should be under 3-5 seconds for a good user experience:

| Component | Target Time |
|-----------|-------------|
| Speech-to-Text | < 1 second |
| PAM Processing | 1-2 seconds |
| Text-to-Speech | < 1 second |
| **TOTAL** | **< 3-5 seconds** |

> 💡 **TIP:** If response times are too slow, consider using streaming responses or pre-generating common responses.

---

## 4. When the Device Arrives

### 4.1 Unbox and Inspect

Your ReSpeaker Lite Voice Assistant Kit should include:

- ☐ ReSpeaker Lite 2-Mic Array board with XIAO ESP32S3 pre-soldered
- ☐ 5W Mono Enclosed Speaker
- ☐ Laser-cut acrylic enclosure pieces
- ☐ Mounting hardware (screws, standoffs)

> ⚠️ **IMPORTANT:** Do NOT assemble the enclosure yet. You need access to the USB port for programming.

#### Initial Connection Test

1. Connect the board to your computer via USB-C
2. The RGB LED should light up (factory firmware)
3. Open Arduino IDE
4. Go to **Tools > Board** and select **"XIAO_ESP32S3"**
5. Go to **Tools > Port** and select the COM port (Windows) or /dev/ttyUSB0 (Linux/Mac)

> 💡 **TIP:** If no port appears, try a different USB cable. Some cables are charge-only and don't support data transfer.

---

### 4.2 Update Firmware (Optional but Recommended)

The ReSpeaker Lite may ship with USB firmware. For this project, you need I2S firmware (version 1.1.0 or later) to properly interface with the XMOS audio chip.

#### Check Current Firmware

1. Visit: **wiki.seeedstudio.com/reSpeaker_usb_v3**
2. Follow the "Firmware Update" section if needed
3. Download I2S firmware from the Seeed GitHub repository

---

### 4.3 Flash Custom PAM Firmware

This is where you load your custom firmware that connects to your PAM API.

#### Prepare Your Firmware Files

You will need to create or customise the following files:

1. **pam_voice_device.ino** - Main Arduino sketch
2. **config.h** - WiFi credentials and API endpoint
3. **hey_pam.ppn** - Your Picovoice wake word model (from Section 3.1)

#### Configuration File Template

Create a file called `config.h` with your settings:

```cpp
// config.h - PAM Voice Device Configuration

#define WIFI_SSID "YourWiFiName"
#define WIFI_PASSWORD "YourWiFiPassword"

#define PAM_API_URL "https://api.wheelsandwins.com/api/pam/voice"

#define PICOVOICE_ACCESS_KEY "your-access-key-here"

#define RECORDING_DURATION_MS 4000  // 4 seconds
#define SAMPLE_RATE 16000
```

#### Main Firmware Sketch Template

Create `pam_voice_device.ino`:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"
#include "Audio.h"

// Picovoice
#include <Picovoice_EN.h>

// Pin definitions for ReSpeaker Lite
#define I2S_BCLK 5
#define I2S_LRC 4
#define I2S_DOUT 6
#define I2S_DIN 44

// LED Pin (WS2812)
#define LED_PIN 21

// Audio objects
Audio audio;

// State machine
enum State {
  LISTENING,
  RECORDING,
  PROCESSING,
  PLAYING,
  ERROR
};
State currentState = LISTENING;

void setup() {
  Serial.begin(115200);
  Serial.println("[INFO] PAM Voice Device v1.0");
  
  // Connect to WiFi
  connectWiFi();
  
  // Initialize Picovoice
  initPicovoice();
  
  // Initialize audio
  initAudio();
  
  Serial.println("[INFO] Listening for 'Hey Pam'...");
}

void loop() {
  switch (currentState) {
    case LISTENING:
      // Check for wake word
      if (detectWakeWord()) {
        Serial.println("[INFO] Wake word detected!");
        setLED(0, 255, 0);  // Green
        currentState = RECORDING;
      }
      break;
      
    case RECORDING:
      recordAudio();
      currentState = PROCESSING;
      break;
      
    case PROCESSING:
      setLED(255, 255, 0);  // Yellow
      sendToAPI();
      currentState = PLAYING;
      break;
      
    case PLAYING:
      setLED(0, 255, 255);  // Cyan
      playResponse();
      currentState = LISTENING;
      setLED(0, 0, 255);  // Blue - back to listening
      break;
      
    case ERROR:
      setLED(255, 0, 0);  // Red
      delay(2000);
      currentState = LISTENING;
      break;
  }
}

void connectWiFi() {
  Serial.println("[INFO] Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[INFO] WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[ERROR] WiFi connection failed!");
    currentState = ERROR;
  }
}

void initPicovoice() {
  Serial.println("[INFO] Initializing Picovoice...");
  // Initialize Porcupine wake word engine
  // Your Picovoice initialization code here
  Serial.println("[INFO] Wake word engine ready");
}

void initAudio() {
  // Initialize I2S for audio input/output
  // Your audio initialization code here
}

bool detectWakeWord() {
  // Check Porcupine for wake word detection
  // Return true if "Hey Pam" detected
  return false;  // Placeholder
}

void recordAudio() {
  Serial.println("[INFO] Recording...");
  // Record audio for RECORDING_DURATION_MS
  delay(RECORDING_DURATION_MS);  // Placeholder
  Serial.println("[INFO] Recording complete");
}

void sendToAPI() {
  Serial.println("[INFO] Sending to PAM API...");
  
  HTTPClient http;
  http.begin(PAM_API_URL);
  http.addHeader("Content-Type", "audio/wav");
  
  // Send audio buffer
  // int responseCode = http.POST(audioBuffer, audioSize);
  
  // Handle response
  // Download response audio
  
  http.end();
}

void playResponse() {
  Serial.println("[INFO] Playing response...");
  // Play the response audio through speaker
  Serial.println("[INFO] Playback complete");
}

void setLED(uint8_t r, uint8_t g, uint8_t b) {
  // Set WS2812 RGB LED color
}
```

#### Flash the Firmware

1. Open your .ino file in Arduino IDE
2. Verify board is set to **XIAO_ESP32S3**
3. Set **Tools > PSRAM > "OPI PSRAM"**
4. Click **Sketch > Upload**
5. Wait for "Done uploading" message

> ⚠️ **IMPORTANT:** If upload fails, hold the BOOT button on the XIAO while clicking Upload, then release after upload starts.

---

## 5. Testing and Debugging

### Serial Monitor

Open **Tools > Serial Monitor** (set baud rate to 115200) to see debug output from your device.

#### Expected Startup Sequence

```
[INFO] PAM Voice Device v1.0
[INFO] Connecting to WiFi...
[INFO] WiFi connected! IP: 192.168.1.100
[INFO] Initializing Picovoice...
[INFO] Wake word engine ready
[INFO] Listening for 'Hey Pam'...
```

### Test Sequence

1. **WiFi Connection Test** - Verify device connects to your network
2. **Wake Word Test** - Say "Hey Pam" and watch for detection in Serial Monitor
3. **Recording Test** - After wake word, speak a command and verify recording
4. **API Test** - Verify audio is sent to your API and response is received
5. **Playback Test** - Verify PAM's response plays through the speaker

### LED Status Codes

Program your firmware to use the RGB LED for status indication:

| LED State | Meaning |
|-----------|---------|
| Blue pulsing | Listening for wake word |
| Green solid | Wake word detected, recording |
| Yellow pulsing | Processing (sending to API) |
| Cyan solid | Playing response |
| Red flashing | Error (check Serial Monitor) |

---

## 6. Production Deployment Checklist

Use this checklist before shipping devices to users:

### Pre-Deployment Verification

- ☐ Device connects to WiFi automatically
- ☐ Wake word detection works reliably (test 10+ times)
- ☐ Audio recording quality is clear
- ☐ API responses are received and played correctly
- ☐ Error handling works (test with WiFi off, API down)
- ☐ LED status indicators are intuitive
- ☐ Device recovers from errors without manual restart

### User Configuration

For end users, you'll need a way to configure WiFi. Options include:

- **WiFi Provisioning Portal** - Device creates its own hotspot for setup
- **Bluetooth Configuration** - Use a companion app to send WiFi credentials
- **Pre-configured** - For your initial 100 users, ask for their WiFi details and flash individually

### Enclosure Assembly

Once testing is complete, assemble the acrylic enclosure:

1. Connect speaker to the board
2. Mount board on standoffs
3. Assemble acrylic layers
4. Ensure microphone holes are not blocked
5. Test again after assembly

---

## 7. Troubleshooting Guide

### Device won't connect to WiFi

- ☐ Check SSID and password in config.h (case-sensitive)
- ☐ Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- ☐ Check router isn't blocking new devices

### Wake word not detected

- ☐ Verify Picovoice Access Key is correct
- ☐ Check .ppn file is included in firmware
- ☐ Speak clearly, 30-100cm from device
- ☐ Reduce background noise

### No audio playback

- ☐ Check speaker is connected to correct pins
- ☐ Verify API returns audio/mpeg content type
- ☐ Check I2S configuration matches hardware

### API connection fails

- ☐ Verify API URL is correct and accessible
- ☐ Check HTTPS certificate is valid
- ☐ Test API endpoint with curl first
- ☐ Check for CORS issues if applicable

### Upload fails in Arduino IDE

- ☐ Hold BOOT button while clicking Upload
- ☐ Try a different USB cable
- ☐ Install/reinstall CP210x drivers
- ☐ Close Serial Monitor before uploading

---

## 8. Quick Reference Card

Keep this page handy during development.

### Key Settings

| Setting | Value |
|---------|-------|
| **Board** | `XIAO_ESP32S3` |
| **PSRAM Setting** | `OPI PSRAM` |
| **Serial Baud Rate** | `115200` |
| **Audio Sample Rate** | `16000 Hz (16kHz)` |
| **Audio Format** | `16-bit, Mono, WAV` |
| **Wake Word** | `"Hey Pam"` |

### Key URLs

| Resource | URL |
|----------|-----|
| Picovoice Console | `console.picovoice.ai` |
| Seeed Wiki | `wiki.seeedstudio.com/reSpeaker_usb_v3` |
| Arduino IDE | `arduino.cc/en/software` |
| ESP32 Board URL | `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json` |
| CP210x Drivers | `silabs.com/developers/usb-to-uart-bridge-vcp-drivers` |

### Pin Definitions (ReSpeaker Lite + XIAO ESP32S3)

| Function | Pin |
|----------|-----|
| I2S BCLK | GPIO 5 |
| I2S LRC (WS) | GPIO 4 |
| I2S DOUT (Speaker) | GPIO 6 |
| I2S DIN (Mic) | GPIO 44 |
| RGB LED (WS2812) | GPIO 21 |

### Contact & Support

- **Seeed Studio Sales (bulk):** iot@seeed.cc
- **Seeed Asia/Pacific:** seeed_apac@seeed.cc
- **Hardware Customization:** odm@seeed.cc

---

## Pre-Arrival Checklist Summary

Complete these before your device arrives:

### Week 1: Accounts & Setup
- ☐ Create Picovoice account at console.picovoice.ai
- ☐ Train "Hey Pam" wake word and download .ppn file
- ☐ Save Picovoice Access Key securely
- ☐ Install Arduino IDE 2.x
- ☐ Add ESP32 board support to Arduino IDE
- ☐ Install required libraries (Picovoice_EN, ESP32-audioI2S, ArduinoJson)

### Week 2: Backend API
- ☐ Design PAM voice API endpoint
- ☐ Implement Speech-to-Text integration
- ☐ Connect to existing PAM logic
- ☐ Implement Text-to-Speech integration
- ☐ Deploy API endpoint
- ☐ Test with curl and sample audio files
- ☐ Measure and optimize response time (target: <5 seconds)

### When Device Arrives
- ☐ Unbox and inspect all components
- ☐ Connect via USB-C and verify detection
- ☐ Update XMOS firmware if needed
- ☐ Create config.h with WiFi and API settings
- ☐ Flash custom firmware
- ☐ Test complete voice flow
- ☐ Assemble enclosure
- ☐ Final testing

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Author:** Wheels & Wins Development Team
