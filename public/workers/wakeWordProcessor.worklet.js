/**
 * Wake Word Audio Processor Worklet
 *
 * Runs on the audio thread for low-latency capture.
 * Captures audio at 16kHz mono and sends to main thread for processing.
 */

class WakeWordProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.isActive = true;

    // Listen for control messages from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'stop') {
        this.isActive = false;
      } else if (event.data.type === 'start') {
        this.isActive = true;
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.isActive) return true;

    const input = inputs[0];
    if (!input || !input[0]) return true;

    const inputChannel = input[0];

    // Accumulate samples into buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      // When buffer is full, send to main thread
      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage({
          type: 'audio',
          samples: this.buffer.slice(),
        });
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('wake-word-processor', WakeWordProcessor);
