// File validation utilities based on working UnimogHub implementation

export const ALLOWED_FILE_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
};

export const FILE_SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024,       // 5MB - matches Supabase bucket limit
  compressed: 2 * 1024 * 1024,   // 2MB after compression
  vehicle: 5 * 1024 * 1024,      // 5MB for vehicle photos (bucket limit)
  document: 50 * 1024 * 1024     // 50MB for PDFs
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface ValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  requireImage?: boolean;
}

/**
 * Validates a file based on type and size
 */
export function validateFile(
  file: File,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    maxSize = FILE_SIZE_LIMITS.avatar,
    allowedTypes = ALLOWED_FILE_TYPES.images,
    requireImage = true
  } = options;

  const warnings: string[] = [];

  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'No file selected'
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File too large (${sizeMB}MB). Maximum size is ${maxMB}MB.`
    };
  }

  // Check file type
  const fileType = file.type.toLowerCase();
  const isValidType = allowedTypes.some(type => 
    type.toLowerCase() === fileType
  );

  if (!isValidType && requireImage) {
    // Check file extension as fallback for HEIC/HEIF
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'heic' || extension === 'heif') {
      warnings.push('HEIC/HEIF files will be converted to JPEG');
    } else {
      return {
        valid: false,
        error: `Invalid file type. Please upload: ${allowedTypes.map(t => t.split('/')[1]).join(', ').toUpperCase()}`
      };
    }
  }

  // Warn about large files that will be compressed
  if (file.size > FILE_SIZE_LIMITS.compressed) {
    warnings.push('Large file will be compressed for better performance');
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Checks if a file needs compression based on size
 */
export function needsCompression(file: File): boolean {
  return file.size > FILE_SIZE_LIMITS.compressed;
}

/**
 * Sanitizes a filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');
  
  // Replace unsafe characters with underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Ensure it has a valid extension
  const parts = sanitized.split('.');
  if (parts.length < 2) {
    sanitized += '.jpg'; // Default to jpg if no extension
  }
  
  return sanitized;
}

/**
 * Generates a secure file path for storage
 */
export function generateSecureFilePath(
  userId: string,
  fileName: string,
  type: 'profile' | 'vehicle' = 'profile'
): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFileName(fileName);
  const ext = sanitized.split('.').pop()?.toLowerCase() || 'jpg';
  
  // Create a unique filename with timestamp
  const uniqueName = `${type}_${timestamp}.${ext}`;
  
  // Return path with user directory
  return `${userId}/${uniqueName}`;
}

/**
 * Extracts file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Checks if file is an image based on MIME type or extension
 */
export function isImageFile(file: File): boolean {
  // Check MIME type first
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }
  
  // Check extension as fallback
  const extension = getFileExtension(file.name);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg'];
  return imageExtensions.includes(extension);
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}