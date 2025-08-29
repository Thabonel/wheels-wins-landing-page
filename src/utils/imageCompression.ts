// Image compression utilities based on working UnimogHub implementation

export interface CompressionOptions {
  maxWidth?: number;       // Default: 1200px
  maxHeight?: number;      // Default: 1200px
  quality?: number;        // Default: 0.85
  maxSizeMB?: number;      // Default: 2MB
  preserveExif?: boolean;  // Default: false
}

/**
 * Compresses an image file to reduce size while maintaining quality
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    maxSizeMB = 2,
    preserveExif = false
  } = options;

  // If file is already small enough, return as is
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxSizeBytes && !needsResize(file, maxWidth, maxHeight)) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width, height } = calculateDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight
          );

          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality adjustment
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              // Create new file from blob
              const compressedFile = new File(
                [blob],
                file.name,
                {
                  type: blob.type || 'image/jpeg',
                  lastModified: Date.now()
                }
              );

              // If still too large, recursively compress with lower quality
              if (compressedFile.size > maxSizeBytes && quality > 0.3) {
                compressImage(file, {
                  ...options,
                  quality: quality - 0.1
                }).then(resolve).catch(reject);
              } else {
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Checks if an image needs to be resized based on dimensions
 */
async function needsResize(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        resolve(img.width > maxWidth || img.height > maxHeight);
      };
      
      img.onerror = () => {
        resolve(false);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      resolve(false);
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Calculates new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // If already within limits, return original
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  // Calculate scaling factor
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio);

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio)
  };
}

/**
 * Converts HEIC/HEIF to JPEG (requires heic2any library)
 * Note: This is a placeholder - actual implementation requires heic2any
 */
export async function convertHEICToJPEG(file: File): Promise<File> {
  // Check if file is HEIC/HEIF
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'heic' && extension !== 'heif') {
    return file;
  }

  // For now, return the original file
  // In production, you would use heic2any library:
  // const blob = await heic2any({ blob: file, toType: 'image/jpeg' });
  // return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  
  console.warn('HEIC/HEIF conversion not implemented. Install heic2any for full support.');
  return file;
}

/**
 * Creates a thumbnail from an image file
 */
export async function createThumbnail(
  file: File,
  size: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate square crop
        const minDimension = Math.min(img.width, img.height);
        const sx = (img.width - minDimension) / 2;
        const sy = (img.height - minDimension) / 2;

        canvas.width = size;
        canvas.height = size;

        // Draw cropped and scaled image
        ctx.drawImage(
          img,
          sx, sy, minDimension, minDimension,
          0, 0, size, size
        );

        // Return as data URL
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Gets image dimensions from a file
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}