// Safe image service with fallback images to avoid CORS issues
export const safeImageService = {
  // Fallback image for trip templates - using a placeholder service
  getFallbackImage: (templateId: string) => {
    // Use a reliable placeholder service that doesn't have CORS issues
    const seed = templateId.replace(/[^a-z0-9]/gi, '');
    return `https://picsum.photos/seed/${seed}/400/250`;
  },

  // Template-specific fallback images using reliable sources
  getTemplateImage: (templateId: string) => {
    // Map template IDs to their correct Supabase storage images
    const imageMap: { [key: string]: string } = {
      'aus-great-ocean-road': 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/twelve_apostles_victoria_2006.jpg',
      'aus-east-coast': 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/great_barrier_reef.jpg',
      'aus-big-lap': 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg',
      'aus-tasmania-circuit': 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/cradle_mountain_dove_lake.jpg',
      'aus-red-centre': 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/uluru_sunset_2007.jpg',
      'aus-southwest-wa': 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/margaret_river_winery.jpg',
      'aus-flinders-ranges': 'https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/trip-images/wilpena_pound_eastern_boundary.jpg',
    };

    return imageMap[templateId] || safeImageService.getFallbackImage(templateId);
  },

  // Check if an image URL is safe (doesn't cause CORS issues)
  isSafeImageUrl: (url: string): boolean => {
    // Allow Supabase storage URLs and placeholder services
    const safeHosts = [
      'kycoklimpzkyrecbjecn.supabase.co',
      'picsum.photos',
      'via.placeholder.com',
      'placehold.co',
      'placeholder.com'
    ];

    try {
      const urlObj = new URL(url);
      return safeHosts.some(host => urlObj.hostname.includes(host));
    } catch {
      return false;
    }
  },

  // Get a safe image URL, falling back if needed
  getSafeImageUrl: (originalUrl: string, templateId: string): string => {
    if (safeImageService.isSafeImageUrl(originalUrl)) {
      return originalUrl;
    }

    console.warn(`Replacing unsafe image URL for template ${templateId}:`, originalUrl);
    return safeImageService.getTemplateImage(templateId);
  }
};