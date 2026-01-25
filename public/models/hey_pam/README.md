# Hey Pam Wake Word Model

This directory contains the "Hey Pam" wake word detection model.

## Status: BLOCKED - Waiting for Model Training

The model files should be placed here after training completes on Google Colab.

## Required Files

After training, convert and place these files here:

```
public/models/hey_pam/
  model.json         # TensorFlow.js model architecture
  group1-shard1of1.bin  # Model weights
```

## Converting from TFLite to TensorFlow.js

1. Complete training in `/Users/thabonel/Code/Pam-Wakeword/`
2. Export the TFLite model from training
3. Convert to TensorFlow.js format:

```bash
# Install tensorflowjs converter
pip install tensorflowjs

# Convert TFLite to TensorFlow.js
tensorflowjs_converter \
  --input_format=tf_lite \
  --output_format=tfjs_graph_model \
  /path/to/stream_state_internal_quant.tflite \
  /Users/thabonel/Code/wheels-wins-landing-page/public/models/hey_pam/
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

## Testing

Once the model is placed here, the `microWakeWordService` will automatically:
1. Load the model on first activation
2. Process audio through the spectrogram pipeline
3. Run inference on each audio frame
4. Trigger detection when confidence > 0.85

## Fallback

If the model is not present, the system falls back to Web Speech API
for wake word detection (less reliable but works everywhere).
