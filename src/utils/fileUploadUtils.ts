// File upload utilities with local storage fallback
// Based on working UnimogHub implementation

import { supabase } from '@/integrations/supabase/client';
import { validateFile, generateSecureFilePath, needsCompression } from './fileValidation';
import { compressImage } from './imageCompression';
import { toast } from 'sonner';

export interface UploadResult {
  url: string | null;
  error?: string;
  isLocal?: boolean;
}

export interface LocalPhotoStorage {
  data: string;       // Base64 encoded image
  timestamp: number;  // Upload timestamp
  type: string;       // MIME type
  size: number;       // Original file size
  fileName: string;   // Original filename
}

/**
 * Main upload function with compression and fallback
 */
export async function uploadFile(
  file: File,
  type: 'profile' | 'vehicle' = 'profile',
  showToast = true
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      if (showToast) toast.error(validation.error!);
      return { url: null, error: validation.error };
    }

    // Show warnings if any
    if (validation.warnings && showToast) {
      validation.warnings.forEach(warning => toast.warning(warning));
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const error = 'You must be logged in to upload files';
      if (showToast) toast.error(error);
      return { url: null, error };
    }

    // Compress image if needed
    let processedFile = file;
    if (needsCompression(file)) {
      if (showToast) toast.info('Compressing image...');
      try {
        processedFile = await compressImage(file);
        console.log(`Compressed from ${file.size} to ${processedFile.size} bytes`);
      } catch (compressionError) {
        console.warn('Compression failed, using original:', compressionError);
      }
    }

    // Generate secure file path
    const filePath = generateSecureFilePath(user.id, processedFile.name, type);
    
    // Try remote upload first
    const remoteResult = await uploadToSupabase(processedFile, filePath, type);
    
    if (remoteResult.url) {
      if (showToast) toast.success('Photo uploaded successfully!');
      return remoteResult;
    }

    // Fallback to local storage
    console.warn('Remote upload failed, using local storage fallback');
    const localResult = await storeLocally(processedFile, type, user.id);
    
    if (localResult.url) {
      if (showToast) {
        toast.warning('Photo saved locally. Will sync when connection is restored.');
      }
      return localResult;
    }

    // Both failed
    const error = 'Failed to upload photo. Please try again.';
    if (showToast) toast.error(error);
    return { url: null, error };

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    if (showToast) toast.error(errorMessage);
    return { url: null, error: errorMessage };
  }
}

/**
 * Upload to Supabase Storage
 */
async function uploadToSupabase(
  file: File,
  filePath: string,
  type: 'profile' | 'vehicle'
): Promise<UploadResult> {
  try {
    // Use the avatars bucket which has been properly initialized
    const bucket = 'avatars';
    
    console.log('Uploading to Supabase:', { bucket, filePath, fileSize: file.size });

    // Upload file with proper error handling
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      
      // Provide more helpful error messages
      if (error.message?.includes('bucket') || error.message?.includes('not found')) {
        return { url: null, error: 'Storage bucket not configured. Please contact support.' };
      }
      if (error.message?.includes('row level security')) {
        return { url: null, error: 'Permission denied. Please ensure you are logged in.' };
      }
      if (error.message?.includes('payload too large') || error.message?.includes('file size')) {
        return { url: null, error: 'File too large. Maximum size is 5MB.' };
      }
      
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('Upload successful:', publicUrl);
    return { url: publicUrl, isLocal: false };

  } catch (error) {
    console.error('Supabase upload exception:', error);
    return { 
      url: null, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * Store image in browser localStorage as fallback
 */
async function storeLocally(
  file: File,
  type: 'profile' | 'vehicle',
  userId: string
): Promise<UploadResult> {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Create storage key
    const storageKey = `photo_${type}_${userId}`;
    
    // Create storage object
    const storageData: LocalPhotoStorage = {
      data: base64,
      timestamp: Date.now(),
      type: file.type,
      size: file.size,
      fileName: file.name
    };

    // Store in localStorage
    localStorage.setItem(storageKey, JSON.stringify(storageData));
    
    console.log('Stored locally:', storageKey);
    return { 
      url: base64, 
      isLocal: true 
    };

  } catch (error) {
    console.error('Local storage error:', error);
    return { 
      url: null, 
      error: 'Failed to save locally' 
    };
  }
}

/**
 * Convert file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get locally stored photo
 */
export function getLocalPhoto(
  type: 'profile' | 'vehicle',
  userId: string
): LocalPhotoStorage | null {
  try {
    const storageKey = `photo_${type}_${userId}`;
    const data = localStorage.getItem(storageKey);
    
    if (!data) return null;
    
    return JSON.parse(data) as LocalPhotoStorage;
  } catch (error) {
    console.error('Error reading local photo:', error);
    return null;
  }
}

/**
 * Remove locally stored photo
 */
export function removeLocalPhoto(
  type: 'profile' | 'vehicle',
  userId: string
): void {
  const storageKey = `photo_${type}_${userId}`;
  localStorage.removeItem(storageKey);
}

/**
 * Sync local photos to remote storage
 */
export async function syncLocalPhotos(userId: string): Promise<void> {
  const types: Array<'profile' | 'vehicle'> = ['profile', 'vehicle'];
  
  for (const type of types) {
    const localPhoto = getLocalPhoto(type, userId);
    
    if (!localPhoto) continue;
    
    try {
      // Check if online
      if (!navigator.onLine) {
        console.log('Offline - skipping sync');
        continue;
      }

      // Convert base64 back to file
      const file = await base64ToFile(
        localPhoto.data,
        localPhoto.fileName,
        localPhoto.type
      );

      // Generate new path
      const filePath = generateSecureFilePath(userId, file.name, type);
      
      // Try to upload
      const result = await uploadToSupabase(file, filePath, type);
      
      if (result.url) {
        // Success - remove local copy
        removeLocalPhoto(type, userId);
        console.log(`Synced ${type} photo to remote storage`);
        
        // Update profile with new URL
        await updateProfilePhotoUrl(result.url, type);
      }
    } catch (error) {
      console.error(`Failed to sync ${type} photo:`, error);
    }
  }
}

/**
 * Convert base64 to File object
 */
async function base64ToFile(
  base64: string,
  fileName: string,
  mimeType: string
): Promise<File> {
  const response = await fetch(base64);
  const blob = await response.blob();
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Update profile with new photo URL
 * NOTE: This is only used for automatic syncing of locally stored photos
 */
async function updateProfilePhotoUrl(
  url: string,
  type: 'profile' | 'vehicle'
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const field = type === 'profile' ? 'profile_image_url' : 'vehicle_image_url';
    
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: url })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update profile during sync:', error);
    }
  } catch (error) {
    console.error('Failed to update profile URL during sync:', error);
  }
}

/**
 * Verify if an image exists at the given URL
 */
export async function verifyImageExists(url: string): Promise<boolean> {
  if (!url) return false;
  
  // If it's a base64 image, it exists locally
  if (url.startsWith('data:image')) {
    return true;
  }

  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Upload with retry logic
 */
export async function uploadWithRetry(
  file: File,
  type: 'profile' | 'vehicle' = 'profile',
  maxRetries = 3
): Promise<UploadResult> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await uploadFile(file, type, i === maxRetries - 1);
    
    if (result.url) {
      return result;
    }

    // Wait before retry (exponential backoff)
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  return { url: null, error: 'Upload failed after multiple attempts' };
}