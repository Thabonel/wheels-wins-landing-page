import React from 'react';
import TripTemplatesOriginal from '../../TripTemplates';
import { useToast } from '@/hooks/use-toast';

// Reuse the existing TripTemplates component
export default function TripTemplates() {
  const { toast } = useToast();
  
  const handleUseTemplate = (template: any) => {
    // Store template in sessionStorage for the trip planner to pick up
    sessionStorage.setItem('selectedTripTemplate', JSON.stringify(template));
    
    // Navigate to Trip Planner
    window.location.href = `/wheels?tab=trip-planner`;
    
    toast({
      title: "Template Selected",
      description: `${template.name} has been loaded in Trip Planner`,
    });
  };

  return <TripTemplatesOriginal onUseTemplate={handleUseTemplate} />;
}