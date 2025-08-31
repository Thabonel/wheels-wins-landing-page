import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ensureAllTemplatesHaveImages } from '@/services/tripTemplateService';
import { ImageIcon, Loader2 } from 'lucide-react';

/**
 * Admin button to populate all template images
 * This should only be used once to populate the database
 */
export function PopulateImagesButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handlePopulateImages = async () => {
    setIsLoading(true);
    setStatus('Starting image population...');

    try {
      await ensureAllTemplatesHaveImages();
      setStatus('✅ Image population complete! Refresh the page to see changes.');
    } catch (error) {
      console.error('Failed to populate images:', error);
      setStatus('❌ Image population failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Template Image Management</h3>
      <p className="text-sm text-gray-600 mb-4">
        Use this button to populate all trip template images from Wikipedia and Mapbox.
        This is a one-time operation that stores images permanently in the database.
      </p>
      
      <Button 
        onClick={handlePopulateImages}
        disabled={isLoading}
        variant="default"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Populating Images...
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4 mr-2" />
            Populate All Template Images
          </>
        )}
      </Button>

      {status && (
        <p className="mt-4 text-sm">{status}</p>
      )}
    </div>
  );
}