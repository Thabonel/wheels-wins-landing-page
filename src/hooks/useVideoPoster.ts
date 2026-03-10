import { useCallback, useRef, useState } from 'react';

interface UseVideoPosterOptions {
  timeOffset?: number; // Time in seconds to extract frame
  quality?: number; // JPEG quality (0-1)
  format?: 'jpeg' | 'png' | 'webp';
}

interface UseVideoPosterReturn {
  extractPoster: (videoElement: HTMLVideoElement) => Promise<string | null>;
  extractPosterFromUrl: (videoUrl: string) => Promise<string | null>;
  isExtracting: boolean;
  error: string | null;
}

export const useVideoPoster = (
  options: UseVideoPosterOptions = {}
): UseVideoPosterReturn => {
  const {
    timeOffset = 0.5,
    quality = 0.9,
    format = 'jpeg'
  } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get or create canvas
  const getCanvas = useCallback(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    return canvasRef.current;
  }, []);

  // Extract poster from existing video element
  const extractPoster = useCallback(async (videoElement: HTMLVideoElement): Promise<string | null> => {
    if (!videoElement) {
      setError('No video element provided');
      return null;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const canvas = getCanvas();
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Wait for video to be ready
      if (videoElement.readyState < 2) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video load timeout'));
          }, 10000);

          const handleLoadedData = () => {
            clearTimeout(timeout);
            videoElement.removeEventListener('loadeddata', handleLoadedData);
            resolve(undefined);
          };

          videoElement.addEventListener('loadeddata', handleLoadedData);
        });
      }

      // Set canvas dimensions
      canvas.width = videoElement.videoWidth || 480;
      canvas.height = videoElement.videoHeight || 480;

      // Seek to specified time if needed
      if (Math.abs(videoElement.currentTime - timeOffset) > 0.1) {
        videoElement.currentTime = timeOffset;

        await new Promise((resolve) => {
          const handleSeeked = () => {
            videoElement.removeEventListener('seeked', handleSeeked);
            resolve(undefined);
          };
          videoElement.addEventListener('seeked', handleSeeked);
        });
      }

      // Draw frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      const mimeType = `image/${format}`;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      console.log(`✅ Extracted poster: ${canvas.width}x${canvas.height}, ${Math.round(dataUrl.length / 1024)}KB`);

      return dataUrl;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Poster extraction failed: ${errorMessage}`);
      console.error('Poster extraction error:', err);
      return null;

    } finally {
      setIsExtracting(false);
    }
  }, [getCanvas, timeOffset, quality, format]);

  // Extract poster from video URL (creates temporary video element)
  const extractPosterFromUrl = useCallback(async (videoUrl: string): Promise<string | null> => {
    if (!videoUrl) {
      setError('No video URL provided');
      return null;
    }

    setIsExtracting(true);
    setError(null);

    const videoElement = document.createElement('video');
    videoElement.crossOrigin = 'anonymous';
    videoElement.muted = true;
    videoElement.playsInline = true;

    try {
      // Load video
      videoElement.src = videoUrl;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000);

        const handleLoadedData = () => {
          clearTimeout(timeout);
          videoElement.removeEventListener('loadeddata', handleLoadedData);
          videoElement.removeEventListener('error', handleError);
          resolve(undefined);
        };

        const handleError = () => {
          clearTimeout(timeout);
          videoElement.removeEventListener('loadeddata', handleLoadedData);
          videoElement.removeEventListener('error', handleError);
          reject(new Error('Failed to load video'));
        };

        videoElement.addEventListener('loadeddata', handleLoadedData);
        videoElement.addEventListener('error', handleError);
      });

      // Extract poster using existing method
      const poster = await extractPoster(videoElement);
      return poster;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Poster extraction from URL failed: ${errorMessage}`);
      console.error('Poster extraction from URL error:', err);
      return null;

    } finally {
      // Clean up
      videoElement.src = '';
      videoElement.load();
      setIsExtracting(false);
    }
  }, [extractPoster]);

  return {
    extractPoster,
    extractPosterFromUrl,
    isExtracting,
    error
  };
};