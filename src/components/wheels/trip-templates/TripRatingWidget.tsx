import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface TripRatingWidgetProps {
  templateId: string;
  averageRating?: number;
  totalRatings?: number;
  onRatingUpdate?: () => void;
  showDetails?: boolean;
}

const TripRatingWidget: React.FC<TripRatingWidgetProps> = ({
  templateId,
  averageRating = 0,
  totalRatings = 0,
  onRatingUpdate,
  showDetails = true
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserRating();
    }
  }, [user, templateId]);

  const fetchUserRating = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_template_ratings')
        .select('rating')
        .eq('template_id', templateId)
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setUserRating(data.rating);
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const handleRating = async (rating: number) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to rate this trip template',
        variant: 'default'
      });
      return;
    }

    setLoading(true);
    try {
      if (userRating) {
        // Update existing rating
        const { error } = await supabase
          .from('trip_template_ratings')
          .update({ rating, updated_at: new Date().toISOString() })
          .eq('template_id', templateId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new rating
        const { error } = await supabase
          .from('trip_template_ratings')
          .insert({
            template_id: templateId,
            user_id: user.id,
            rating
          });

        if (error) throw error;
      }

      setUserRating(rating);
      toast({
        title: 'Rating Saved',
        description: `You rated this trip ${rating} star${rating > 1 ? 's' : ''}`
      });

      if (onRatingUpdate) {
        onRatingUpdate();
      }
    } catch (error) {
      console.error('Error saving rating:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your rating',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoveredRating || userRating || 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              disabled={loading}
              className={cn(
                "p-1 transition-colors",
                loading && "cursor-not-allowed opacity-50"
              )}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  star <= displayRating
                    ? "fill-yellow-400 text-yellow-400"
                    : star <= averageRating
                    ? "fill-yellow-200 text-yellow-200"
                    : "text-gray-300"
                )}
              />
            </button>
          ))}
        </div>
        {showDetails && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-gray-500">({totalRatings} rating{totalRatings !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>
      {userRating && (
        <p className="text-xs text-gray-600">
          Your rating: {userRating} star{userRating > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default TripRatingWidget;