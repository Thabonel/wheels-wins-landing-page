import React from 'react';
import TripTemplatesOriginal from '../../TripTemplates';
import { useToast } from '@/hooks/use-toast';

// Reuse the existing TripTemplates component
export default function TripTemplates() {
  const { toast } = useToast();
  
  const handleUseTemplate = (template: any) => {
    // Navigate to Trip Planner 2 with template data
    const templateData = encodeURIComponent(JSON.stringify(template));
    window.location.href = `/wheels?tab=fresh-planner&template=${templateData}`;
    
    toast({
      title: "Template Selected",
      description: `${template.name} has been loaded in Trip Planner`,
    });
  };

  return <TripTemplatesOriginal onUseTemplate={handleUseTemplate} />;
}