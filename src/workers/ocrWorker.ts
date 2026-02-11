// OCR Web Worker for non-blocking Tesseract.js processing
import Tesseract from 'tesseract.js';

export interface OCRWorkerMessage {
  type: 'PROCESS_OCR';
  data: {
    imageBlob: Blob;
    language: string;
    options?: any;
    jobId: string;
  };
}

export interface OCRWorkerResponse {
  type: 'PROGRESS' | 'SUCCESS' | 'ERROR';
  jobId: string;
  data: {
    status?: string;
    progress?: number;
    text?: string;
    confidence?: number;
    words?: any[];
    message?: string;
    error?: string;
  };
}

// Web Worker global scope
declare const self: Worker & typeof globalThis;

self.addEventListener('message', async (event: MessageEvent<OCRWorkerMessage>) => {
  const { type, data } = event.data;

  if (type === 'PROCESS_OCR') {
    const { imageBlob, language, options, jobId } = data;

    try {
      // Send initial progress
      self.postMessage({
        type: 'PROGRESS',
        jobId,
        data: { status: 'Starting OCR processing...', progress: 0 }
      } as OCRWorkerResponse);

      // Process with Tesseract.js in the worker thread
      const result = await Tesseract.recognize(imageBlob, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = m.progress || 0;
            self.postMessage({
              type: 'PROGRESS',
              jobId,
              data: {
                status: `Reading receipt... ${Math.round(progress * 100)}%`,
                progress
              }
            } as OCRWorkerResponse);
          }
        },
        ...options
      });

      // Send successful result
      self.postMessage({
        type: 'SUCCESS',
        jobId,
        data: {
          text: result.data.text,
          confidence: (result.data.confidence || 0) / 100,
          words: (result.data as any).words || []
        }
      } as OCRWorkerResponse);

    } catch (error: any) {
      // Send error result
      self.postMessage({
        type: 'ERROR',
        jobId,
        data: {
          message: error.message || 'OCR processing failed',
          error: error.toString()
        }
      } as OCRWorkerResponse);
    }
  }
});

export {};