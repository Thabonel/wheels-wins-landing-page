/**
 * Image Storage Service
 * Handles automatic downloading and storage of trip template images in Supabase Storage
 * This service ensures images are permanently available and not dependent on external URLs
 */

import { supabase } from '@/integrations/supabase/client';
import { TripTemplate } from './tripTemplateService';

export class ImageStorageService {
  private static readonly BUCKET_NAME = 'public-assets';
  private static readonly FOLDER_NAME = 'trip-templates';
  
  /**
   * Verified image URLs from Unsplash that we want to store permanently
   */
  private static readonly VERIFIED_IMAGES: Record<string, string> = {
    // Great Ocean Road - Twelve Apostles
    'aus-great-ocean-road': 'https://images.unsplash.com/photo-1529258283598-8d6fe60b27f4?w=800&q=80',
    
    // Big Lap - Uluru
    'aus-big-lap': 'https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8?w=800&q=80',
    
    // East Coast - Great Barrier Reef
    'aus-east-coast': 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&q=80',
    
    // Red Centre - Uluru at sunset
    'aus-red-centre': 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&q=80',
    
    // Savannah Way - Kakadu landscape  
    'aus-savannah-way': 'https://images.unsplash.com/photo-1521706862577-47b053587f91?w=800&q=80',
    
    // Tasmania Circuit - Cradle Mountain
    'aus-tasmania-circuit': 'https://images.unsplash.com/photo-1619956947777-9c2d38007238?w=800&q=80',
    
    // Southwest WA - Margaret River vineyards
    'aus-southwest-wa': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80',
    
    // Queensland Outback - Outback landscape
    'aus-queensland-outback': 'https://images.unsplash.com/photo-1523712900580-a5cc2e0112ed?w=800&q=80',
    
    // Murray River - River landscape
    'aus-murray-river': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
    
    // Gibb River Road - Kimberley gorge
    'aus-gibb-river-road': 'https://images.unsplash.com/photo-1601579621145-ffef641e749f?w=800&q=80',
    
    // Victorian High Country - Mountain landscape
    'aus-high-country': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    
    // Nullarbor - Australian outback desert road
    'aus-nullarbor': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
    
    // Cape York - Remote beach
    'aus-cape-york': 'https://images.unsplash.com/photo-1523952578875-e6bb18b26645?w=800&q=80',
    
    // Flinders Ranges - Mountain landscape
    'aus-flinders-ranges': 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800&q=80',
    
    // Sunshine Coast - Beach scene
    'aus-sunshine-coast': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'
  };

  /**
   * Download an image from a URL and return as blob
   */
  private static async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    return response.blob();
  }

  /**
   * Upload image blob to Supabase Storage
   */
  private static async uploadToStorage(
    templateId: string, 
    imageBlob: Blob
  ): Promise<string> {
    const fileName = `${templateId}.jpg`;
    const filePath = `${this.FOLDER_NAME}/${fileName}`;
    
    console.log(`🔄 Uploading ${fileName} to Supabase Storage...`);
    
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filePath, imageBlob, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
        contentType: 'image/jpeg'
      });
    
    if (error) {
      console.error(`❌ Failed to upload ${fileName}:`, error);
      throw error;
    }
    
    console.log(`✅ Uploaded ${fileName} to Supabase Storage`);
    
    // Return the public URL
    const { data: urlData } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  }

  /**
   * Check if image already exists in Supabase Storage
   */
  private static async imageExists(templateId: string): Promise<boolean> {
    const fileName = `${templateId}.jpg`;
    const filePath = `${this.FOLDER_NAME}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .list(this.FOLDER_NAME, {
        search: fileName
      });
    
    if (error) {
      console.error(`Error checking if ${fileName} exists:`, error);
      return false;
    }
    
    return data.some(file => file.name === fileName);
  }

  /**
   * Get Supabase Storage URL for a template image
   */
  private static getStorageUrl(templateId: string): string {
    const fileName = `${templateId}.jpg`;
    const filePath = `${this.FOLDER_NAME}/${fileName}`;
    
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Ensure image is stored in Supabase Storage
   * Downloads and uploads if not already present
   */
  static async ensureImageStored(templateId: string): Promise<string> {
    // Check if we have a verified image URL for this template
    const sourceUrl = this.VERIFIED_IMAGES[templateId];
    if (!sourceUrl) {
      throw new Error(`No verified image URL for template: ${templateId}`);
    }

    // Check if image already exists in storage
    const exists = await this.imageExists(templateId);
    if (exists) {
      console.log(`✅ Image already exists for ${templateId}`);
      return this.getStorageUrl(templateId);
    }

    // Download and upload the image
    console.log(`📥 Downloading and storing image for ${templateId}...`);
    
    try {
      const imageBlob = await this.downloadImage(sourceUrl);
      const storageUrl = await this.uploadToStorage(templateId, imageBlob);
      
      console.log(`🎉 Successfully stored image for ${templateId}`);
      return storageUrl;
      
    } catch (error) {
      console.error(`❌ Failed to store image for ${templateId}:`, error);
      // Fallback to original URL if storage fails
      return sourceUrl;
    }
  }

  /**
   * Batch ensure images are stored for multiple templates
   */
  static async ensureImagesStored(templates: TripTemplate[]): Promise<Map<string, string>> {
    const imageUrls = new Map<string, string>();
    
    console.log(`🔄 Ensuring ${templates.length} template images are stored...`);
    
    // Process images in parallel batches of 3 to avoid overwhelming the service
    const batchSize = 3;
    for (let i = 0; i < templates.length; i += batchSize) {
      const batch = templates.slice(i, i + batchSize);
      
      const promises = batch.map(async (template) => {
        try {
          const url = await this.ensureImageStored(template.id);
          imageUrls.set(template.id, url);
        } catch (error) {
          console.error(`Failed to process image for ${template.id}:`, error);
          // Don't store URL if failed - will use fallback
        }
      });
      
      await Promise.all(promises);
    }
    
    console.log(`✅ Processed ${imageUrls.size}/${templates.length} template images`);
    return imageUrls;
  }

  /**
   * Get image URL for a template (storage URL if available, fallback otherwise)
   */
  static async getTemplateImageUrl(templateId: string): Promise<{
    imageUrl: string;
    isStored: boolean;
  }> {
    try {
      // Try to get from storage first
      const exists = await this.imageExists(templateId);
      if (exists) {
        return {
          imageUrl: this.getStorageUrl(templateId),
          isStored: true
        };
      }
      
      // Fallback to verified URL
      const sourceUrl = this.VERIFIED_IMAGES[templateId];
      if (sourceUrl) {
        return {
          imageUrl: sourceUrl,
          isStored: false
        };
      }
      
      throw new Error(`No image available for template: ${templateId}`);
      
    } catch (error) {
      console.error(`Error getting image URL for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize storage by ensuring all verified images are stored
   * Call this on app startup or when needed
   */
  static async initializeStorage(): Promise<void> {
    console.log('🚀 Initializing image storage...');
    
    const templateIds = Object.keys(this.VERIFIED_IMAGES);
    const fakeTemplates = templateIds.map(id => ({ id } as TripTemplate));
    
    await this.ensureImagesStored(fakeTemplates);
    
    console.log('🎉 Image storage initialization complete');
  }
}

export const imageStorageService = ImageStorageService;