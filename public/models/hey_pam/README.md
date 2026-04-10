# Hey Pam Wake Word Model

This directory contains the "Hey Pam" wake word detection model.

## Status: Needs TF.js Conversion

A trained TFLite model (`hey_pam.tflite`) exists but must be converted to TF.js format
before the browser can use it. Until converted, the system falls back to Web Speech API.

## Required Files

After conversion, this directory should contain:

```
public/models/hey_pam/
  model.json              # TF.js graph model architecture
  group1-shard1of1.bin    # Model weights
```

## Converting from TFLite to TensorFlow.js

```bash
pip install tensorflowjs

tensorflowjs_converter \
  --input_format=tf_lite \
  --output_format=tfjs_graph_model \
  public/models/hey_pam/hey_pam.tflite \
  public/models/hey_pam/
```

## Model Architecture (MixedNet)

| Parameter | Value |
|-----------|-------|
| Architecture | MixedNet (streaming-capable) |
| Tensor Arena | ~45KB |
| First Conv | 32 filters, kernel 5, stride 3 |
| MixConv Blocks | [5], [7,11], [9,15], [23] kernels |
| Output | Dense(1, sigmoid) |

## Training Parameters

- Sample rate: 16kHz
- Mel features: 40
- Frame stride: 10ms
- Frame length: 25ms

## How It Works

Once `model.json` is placed here, the `microWakeWordService` will:
1. Detect model availability via HEAD request (fast, no CDN load if missing)
2. Load TensorFlow.js from CDN
3. Load the graph model via `tf.loadGraphModel()`
4. Process audio through the mel spectrogram pipeline
5. Run inference on each audio frame
6. Trigger detection when confidence > 0.85

## Fallback

If `model.json` is not present, the system silently falls back to Web Speech API
for wake word detection. No console errors are generated.
