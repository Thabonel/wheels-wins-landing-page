
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/components/ui/use-toast";

export const useDrawerFetch = (authState: string) => {
  const [existingDrawers, setExistingDrawers] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchExistingDrawers = async () => {
    if (authState !== 'authenticated') {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('drawers')
        .select('name');

      if (error) {
        console.error("Error fetching existing drawers:", error);
        if (error.code === '42501') {
          toast({
            title: "Permission Error",
            description: "Unable to access your drawers. Please try refreshing the page.",
            variant: "destructive",
          });
        }
        return;
      }

      setExistingDrawers(data?.map(d => d.name.toLowerCase()) || []);
    } catch (error) {
      console.error("Unexpected error in fetchExistingDrawers:", error);
    }
  };

  useEffect(() => {
    if (authState === 'authenticated') {
      fetchExistingDrawers();
    }
  }, [authState]);

  return {
    existingDrawers,
    setExistingDrawers,
    fetchExistingDrawers
  };
};
