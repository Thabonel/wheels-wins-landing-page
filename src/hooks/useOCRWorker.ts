// Custom hook for managing OCR Web Worker
import { useCallback, useRef, useEffect } from 'react';
import type { OCRWorkerMessage, OCRWorkerResponse } from '@/workers/ocrWorker';

interface OCRJob {
  jobId: string;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  onProgress?: (progress: { status: string; progress?: number }) => void;
}

export interface OCRResult {
  text: string;
  confidence: number;
  words?: any[];
}

export function useOCRWorker() {
  const workerRef = useRef<Worker | null>(null);
  const jobsRef = useRef<Map<string, OCRJob>>(new Map());

  // Initialize worker on first use
  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      try {
        // Create worker from TypeScript file
        workerRef.current = new Worker(
          new URL('../workers/ocrWorker.ts', import.meta.url),
          { type: 'module' }
        );

        workerRef.current.onmessage = (event: MessageEvent<OCRWorkerResponse>) => {
          const { type, jobId, data } = event.data;
          const job = jobsRef.current.get(jobId);

          if (!job) {
            console.warn('OCR Worker: Received result for unknown job:', jobId);
            return;
          }

          switch (type) {
            case 'PROGRESS':
              if (job.onProgress && data.status) {
                job.onProgress({
                  status: data.status,
                  progress: data.progress
                });
              }
              break;

            case 'SUCCESS':
              jobsRef.current.delete(jobId);
              job.resolve({
                text: data.text || '',
                confidence: data.confidence || 0,
                words: data.words || []
              });
              break;

            case 'ERROR':
              jobsRef.current.delete(jobId);
              job.reject(new Error(data.message || 'OCR processing failed'));
              break;
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('OCR Worker error:', error);
          // Reject all pending jobs
          for (const [jobId, job] of jobsRef.current.entries()) {
            job.reject(new Error('OCR Worker crashed'));
            jobsRef.current.delete(jobId);
          }
        };

      } catch (error) {
        console.error('Failed to initialize OCR Worker:', error);
        throw new Error('OCR Worker not available');
      }
    }
  }, []);

  // Process OCR with Web Worker
  const processOCR = useCallback((
    imageBlob: Blob,
    language: string = 'eng',
    options: any = {},
    onProgress?: (progress: { status: string; progress?: number }) => void
  ): Promise<OCRResult> => {
    return new Promise((resolve, reject) => {
      try {
        initWorker();

        if (!workerRef.current) {
          throw new Error('OCR Worker not available');
        }

        const jobId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store job for response handling
        jobsRef.current.set(jobId, {
          jobId,
          resolve,
          reject,
          onProgress
        });

        // Send OCR task to worker
        const message: OCRWorkerMessage = {
          type: 'PROCESS_OCR',
          data: {
            imageBlob,
            language,
            options,
            jobId
          }
        };

        workerRef.current.postMessage(message);

        // Timeout after 30 seconds
        setTimeout(() => {
          if (jobsRef.current.has(jobId)) {
            jobsRef.current.delete(jobId);
            reject(new Error('OCR processing timeout (30s)'));
          }
        }, 30000);

      } catch (error) {
        reject(error);
      }
    });
  }, [initWorker]);

  // Check if Web Worker is supported
  const isWorkerSupported = useCallback(() => {
    return typeof Worker !== 'undefined';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        // Cancel all pending jobs
        for (const [jobId, job] of jobsRef.current.entries()) {
          job.reject(new Error('Component unmounted'));
        }
        jobsRef.current.clear();

        // Terminate worker
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return {
    processOCR,
    isWorkerSupported
  };
}