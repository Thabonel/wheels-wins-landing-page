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
    const imageMap: { [key: string]: string } = {
      'aus-great-ocean-road': 'https://picsum.photos/seed/greatoceanroad/400/250',
      'aus-east-coast': 'https://picsum.photos/seed/eastcoast/400/250',
      'aus-big-lap': 'https://picsum.photos/seed/biglap/400/250',
      'aus-tasmania-circuit': 'https://picsum.photos/seed/tasmania/400/250',
      'aus-red-centre': 'https://picsum.photos/seed/redcentre/400/250',
      'aus-savannah-way': 'https://picsum.photos/seed/savannah/400/250',
      'aus-southwest-wa': 'https://picsum.photos/seed/southwest/400/250',
      'aus-queensland-outback': 'https://picsum.photos/seed/queensland/400/250',
      'aus-murray-river': 'https://picsum.photos/seed/murray/400/250',
      'aus-gibb-river-road': 'https://picsum.photos/seed/gibbriver/400/250',
      'aus-high-country': 'https://picsum.photos/seed/highcountry/400/250',
      'aus-nullarbor': 'https://picsum.photos/seed/nullarbor/400/250',
      'aus-cape-york': 'https://picsum.photos/seed/capeyork/400/250',
      'aus-flinders-ranges': 'https://picsum.photos/seed/flinders/400/250',
      'aus-sunshine-coast': 'https://picsum.photos/seed/sunshine/400/250',
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